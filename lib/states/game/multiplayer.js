var debug = require('debug')('states:game:multiplayer')
  , settings = require('../../settings')
  , see = require('../../support/see')
  , keys = require('mousetrap')
  , World = require('../../world')
  , inputs = require('../../inputs')
  , Game = require('../../game')
  , estimateSlowDown = require('../../support/estimate-slow-down')
  , now = require('now')
  , latency = require('latency')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , $ = require('jquery')
  , dmaf = require('../../dmaf.min');

var tell = null
  , lock = false
  , replay = false
  , puckDirection = 0;

var lastSent = now()
  , sent = {}
  , times = []
  , timesIndex = 0;

// a lazy hack because it's used all over this
// file. and this is better than relying on a
// global object to have been defined...
var ctx;

exports.enter = function(context){
  ctx = context;
  if( !ctx.multiplayer ){ return; }

  // create a network game
  ctx.sync = new Game('sync');
  $('#extras').hide();

  if( ctx.query.render == 'sync' ){
    var Renderer2D = require('../../renderer-2d')
    ctx.sync.setRenderer(new Renderer2D(document.getElementById('canv-db')))
  }

  // default to turn momentum off for multiplayer
  settings.data.paddleMomentum = false;

  // invert the controls for the "other" player
  settings.data.invertControls = !ctx.network.winner;

  // lower the framerate and raise the speed
  settings.data.framerate = settings.data.defaultFramerate/2;
  settings.data.timestep = settings.data.defaultTimestep*2;
  settings.data.unitSpeed = settings.data.defaultUnitSpeed*2;

  ctx.game.on('enter frame',flushInputs);
  ctx.game.on('leave frame',forwardSync);
  // ctx.game.on('pre update',lockOpponentPaddle);
  // ctx.game.on('post update',timeShift);

  ctx.sync.on('pre update',puckDirectionSave);
  ctx.sync.on('post update',puckDirectionCheck);

  ctx.network.on('change pathname',pathnameChange)
  ctx.network.on('change latency',onlatency)
  ctx.network.on('message',inputs.network.onmessage)
  ctx.game.world.latency = ctx.latency;

  inputs.network.on('ping',onping)
  inputs.network.on('pong',onpong)
  inputs.network.on('message',onmessage)
  inputs.network.on('ack',onack)
  inputs.network.on('move',onmove)
  // inputs.network.on('hit',hitOrMiss)
  // inputs.network.on('miss',hitOrMiss)

  keys.bind('r',forceReplay)
}

exports.leave = function(ctx){
  // reset the framerate when going from
  // multiplayer to singleplayer
  settings.data.framerate = settings.data.defaultFramerate;
  settings.data.timestep = settings.data.defaultTimestep;
  settings.data.unitSpeed = settings.data.defaultUnitSpeed;

  settings.data.paddleMomentum = true;
  settings.data.invertControls = false;

  ctx.game.off('enter frame',flushInputs);
  ctx.game.off('leave frame',forwardSync);
  ctx.game.off('pre update',lockOpponentPaddle);
  ctx.game.off('post update',timeShift);

  if( ctx.sync ){
    ctx.sync.off('pre update',puckDirectionSave);
    ctx.sync.off('post update',puckDirectionCheck);
    ctx.sync = null;
  }

  ctx.network.off('change pathname',pathnameChange)
  ctx.network.off('change latency',onlatency)
  ctx.network.off('message',inputs.network.onmessage)

  inputs.network.off('ping',onping)
  inputs.network.off('pong',onpong)
  inputs.network.off('message',onmessage)
  inputs.network.off('ack',onack)
  inputs.network.off('move',onmove)
  // inputs.network.off('hit',hitOrMiss)
  // inputs.network.off('miss',hitOrMiss)

  ctx.renderer.triggerEvent('friendLeft');

  keys.unbind('r',forceReplay)
}

// used to measure the time since the last packet
// to send KEEP_ALIVE packets.
function flushInputs(world){
  var sendRate = 1000/settings.data.sendRate;
  var n = now();
  if( n - lastSent > sendRate ){
    if( inputs.network.flush() ){
      lastSent = n;
    } else if( world.state == World.PLAYING && n - lastSent > settings.data.keepAliveInterval ){
      var id = (Math.random()*65535)|0; // 16bit
      sent[id] = now();
      inputs.record(inputs.types.PING,id);
    }
  }
}

function forwardSync(world){
  var state = ctx.sync.world.state
    , frame = ctx.sync.world.frame;

  // silence
  tell = dmaf.tell;
  dmaf.tell = silentDMAF;

  // forward the sync game
  inputs.network.forward(ctx.sync,world.frame,ctx.network.winner)

  // render the sync game
  // (adds a 'hack'-puck which shows it's position in "game")
  if( ctx.query.render == 'sync' ){
    var p = ctx.game.world.pucks.values[0];
    p && ctx.sync.world.pucks.set('hack',p)
    ctx.sync.render()
    p && ctx.sync.world.pucks.del('hack')
  }

  // has a replay been requested?
  if( replay ){
    // console.log('replaying %s -> %s',ctx.sync.world.frame,world.frame)
    var frames = Math.floor(ctx.latency*settings.data.timestep);
    inputs.network.replay(ctx.sync.world,world,frames)
    replay = false;
  }

  // end of silence
  dmaf.tell = tell;
}

// lock the position of the paddle
// data.x should be removed after a replay
// so this should be enough
function lockOpponentPaddle(world){
  if( world.state !== World.PLAYING ){
    return;
  }

  var paddle = world.paddles.get(world.opponent.paddle);
  if( paddle && paddle.data.x ){
    console.log('opponent paddle locked at %s',paddle.data.x)
    paddle.previous[0] = paddle.current[0] = paddle.data.x;
  }
}

function timeShift(world){
  if( world.state !== World.PLAYING ){
    return;
  }

  // slow down the puck if necessary
  var paddle = world.paddles.get(world.opponent.paddle);
  var puck = world.pucks.values[0];
  var spuck = ctx.sync.world.pucks.get(puck.index)
  if( world.frame > 1 && puck && ctx.latency ){

    // max out at 300ms latency to avoid insanely slow pucks
    // (a warning will be shown at this point anyway)
    // var t = 1000/settings.data.sendRate + Math.min(ctx.latency,300);
    // var t = Math.min(ctx.latency,300); // latency should include send rate, right?
    var t = Math.abs( world.frame - ctx.sync.world.frame ) * settings.data.timestep;
    var m = estimateSlowDown(paddle.current[1] - puck.current[1],spuck.velocity[1],t)

    if( m !== null && m !== 1 ){
      // based on the sync puck velocity or we'll have
      // a squared deceleration.
      var l = vec.len(spuck.velocity);
      if( l ){
        vec.norm(puck.velocity,puck.velocity)
        vec.smul(puck.velocity,m*l,puck.velocity);
        vec.sub(puck.current,puck.velocity,puck.previous)
      }
    }
  }
}

function puckDirectionSave(world){
  if( world.state !== World.PLAYING ){
    return;
  }

  // store the pre-update direction to track direction
  // change
  var puck = world.pucks.values[0];
  if( puck ){
    puckDirection = puck.velocity[1] > 0 ? +1 : -1;
    // console.log('setting puck direction',puckDirection)
  }
}

function puckDirectionCheck(world){
  if( world.state !== World.PLAYING ){
    return;
  }

  var puck = world.pucks.values[0];
  if( puck && puckDirection ){
    var prevDirection = puckDirection;
    puckDirection = puck.velocity[1] > 0 ? +1 : -1;
    // console.log('getting puck direction',prevDirection,puckDirection)
    if( prevDirection !== puckDirection ){
      // console.log('puck direction change player: %s v: %s',world.me === world.players.a ? 'a' : 'b', puck.velocity[1])
      if( (world.me === world.players.a && puck.velocity[1] > 0) ||
          (world.me === world.players.b && puck.velocity[1] < 0) ){
        // console.log('replaying because of direction change')
        replay = true;
      }
    }
  }
}

function pathnameChange(pathname){
  switch(pathname){
    case '/game/pause':
      if( ctx.pathname === '/game/play' ){
        see(pathname);
      }
      break;
    case '/game/play':
      if( ctx.pathname === '/game/pause' ){
        see(pathname);
      }
      break;
  }
}

function onmessage(buf){
  // to avoid the buffer growing out of hand
  // when a tab is inactive we pause the game
  // when the buffer is at 50%
  if( buf.length > 128 ){
    see('/game/pause');
  }
  ctx.network.send(buf)
}
function onping(id){
  inputs.record(inputs.types.PONG,id)
}
function onpong(id){
  var p = sent[id];

  // invalid PONG!
  if( !p ){ return; }

  // latency is one-way
  var n = now();
  var d = (n - p)/2;

  // store in a circular array w. 128 elements
  times[timesIndex] = d;
  timesIndex = (timesIndex+1) & 127;

  // wait until we have a bit of times before
  // updating ctx.latency. for better accuracy.
  if( times.length > 16 ){
    ctx.latency = Math.round(latency(times));
    ctx.network.emit('change latency',ctx.latency)
  }
}
function onack(ack){
  // console.log('ack %s world %s diff %s',ack,ctx.game.world.frame,ack-ctx.game.world.frame)
  if( ack - 5 > ctx.game.world.frame ){
    var steps = Math.min(50,ack - ctx.game.world.frame);
    for(var i=0;i<steps;i++){
      ctx.game.update();
    }
  }
}
function onmove(input){
  if( input[1] == ctx.game.world.opponent.paddle ){
    inputs.types.execute(ctx.game.world,input)
  }
}
function onlatency(latency){
  ctx.game.world.latency = latency;
}
function forceReplay(){
  replay = true;
}
function hitOrMiss(x,v,f){
  if( ctx.game.world.state !== World.PLAYING ){
    return;
  }

  // console.log('received hit or miss. opponent paddle will be at x: %s v: %s',x,v,f)
  var paddle = ctx.game.world.paddles.get(ctx.game.world.opponent.paddle);

  // store the velocity on the paddle so it can be used when
  // calculating the momentum instead of the actual velocity
  // which may be 0;
  paddle.data.vx = v;
  paddle.data.x = x;
}

function silentDMAF(id){
  var valid = ~id.indexOf('_screen') ||
              ~id.indexOf('countdown_') ||
              ~id.indexOf('_match') ||
              ~id.indexOf('_round') ||
              ~id.indexOf('level_') ||
              ~id.indexOf('_score');

  if( valid ){
    tell.apply(dmaf,arguments);
  } else if( dmaf.log ){
    console.log('dmaf.tell (silent): %s',id)
  }
}