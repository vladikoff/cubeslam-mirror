var settings = require('../settings')
  , shapes = require('../geom-sim/shapes')
  , see = require('../support/see')
  , mouse = require('../support/mouse')
  , lock = require('../support/pointer-lock')
  , keys = require('mousetrap')
  , World = require('../world')
  , buffer = require('../support/buffer')
  , Inputs = require('../inputs')
  , actions = require('../actions')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , $ = require('jquery');

exports.Setup = {
  enter: function(ctx){

    //hack to make multiplayer param visible to renderer via world
    // TODO remove this because it will cause problems whenever
    //      ctx.multiplayer were to change as it's not a reference
    //      but a copy.
    ctx.game.world.multiplayer = ctx.multiplayer;

    // TODO is this the right direction?
    ctx.game.renderer.activePlayer(ctx.network.winner? 1 : 0)

    setupLevels(ctx,ctx.game)
    setupLevels(ctx,ctx.networkGame)

    if( ctx.multiplayer ){
      networkInput(ctx);
    }

    this.disconnected = function(){
      // TODO store input history
      // and have some kind of "don't leave this page
      // and get your friend to reconnect on this url"
      // message and when friend reconnects send the
      // history, let the game resync /game/resync (web worker?)
      // and then go to /game/wait. when both peers are at
      // /game/wait go to /game/start and let the game begin
      // TODO maybe we can store it in local storage?
      see('/friend/left')
    }
    ctx.network.on('disconnected',this.disconnected)

    var game = ctx.game
      , world = game.world
      , isLeft = 0
      , isRight = 0;

    this.update = function(world,timestep){
      if( world.paused ) return;
      isLeft  && game.emit('input',World.MOVE,world.me.paddle,-settings.data.keyboardSensitivity*10);
      isRight && game.emit('input',World.MOVE,world.me.paddle,+settings.data.keyboardSensitivity*10);
      mouse.tick() // will emit 'move' or 'click'
    }
    game.on('pre update',this.update)


    mouse.on('move',function(dx,dy,dt){
      game.emit('input',World.MOVE,world.me.paddle,dx * settings.data.mouseSensitivity)
    })



    keys.bind(['left','a'],function(){ isLeft = 1; },'keydown')
    keys.bind(['left','a'],function(){ isLeft = 0; },'keyup')
    keys.bind(['right','d'],function(){ isRight = 1; },'keydown')
    keys.bind(['right','d'],function(){ isRight = 0; },'keyup')
    // keys.bind(['up','w'],function(){ game.emit('input',World.SHOOT,world.me.paddle) })
    // mouse.on('click',function(x,y,dt){ game.emit('input',World.SHOOT,world.me.paddle); })
    mouse.start(document.getElementById('game'))
  },

  leave: function(ctx){

    ctx.network.off('disconnected',this.disconnected)

    ctx.game.off('update',this.update)
    keys.unbind('right','keyup')
    keys.unbind('right','keydown')
    keys.unbind('left','keyup')
    keys.unbind('left','keydown')
    keys.unbind('up')
    mouse.off('click')
    mouse.off('move')
    mouse.stop()

  }
}


exports.Information = {
  enter: function(ctx){
    startGame(ctx.game,!ctx.network.winner)
    startGame(ctx.networkGame,ctx.network.winner)

    ctx.game.emit('input',World.PLAY)
    ctx.renderer.changeView("play");

    $('#scores').hide()


    this.play = $('.play',ctx.el).show()
    this.play.on('click',function(){
      see('/game/start')
    });
    keys.bind('space', function(){ see('/game/start') });


    if( lock.available && settings.data.pointerLock ){
      settings.data.pointer = lock(this.play[0]);
    }
  },

  leave: function(ctx){
    this.play.off('click');
    keys.unbind('space');
    $('#scores').show()
  }
}


exports.Waiting = {
  enter: function(ctx){},
  leave: function(ctx){}
}

exports.Start = {

  enter: function(ctx){

    //use pointer lock if activated and available
    if( settings.data.pointer ){
      mouse.stop();
      var pointer = settings.data.pointer;
      pointer.on('move',function(dx,dy){
        ctx.game.emit('input',World.MOVE,ctx.game.world.me.paddle,dx * settings.data.mouseSensitivity)
      })
      // fallback to mouse move in case it's denied
      pointer.on('error',function(){
        settings.data.pointer = null;
        mouse.start()
      })
      pointer.on('release', function(){
        mouse.start()
      })
    }


    startGame(ctx.game,!ctx.network.winner,1)
    startGame(ctx.networkGame,ctx.network.winner,1)

    // update the scores
    updateScores(ctx.game.world)

    // show scores
    $("#scores .singleplayer").toggle(!ctx.multiplayer);
    $("#scores .multiplayer").toggle(!!ctx.multiplayer);

    // AI
    // singleplayer
    if( !ctx.multiplayer ){
      ctx.game.ai.setTarget(ctx.game.world.opponent.paddle);
      if( ctx.networkGame )
        ctx.networkGame.ai.setTarget(ctx.networkGame.world.opponent.paddle);

    // multiplayer
    } else {
      // debug multiplayer AI
      if( ~window.location.href.indexOf('ai') )
        ctx.game.ai.setTarget(ctx.networkGame.world.me.paddle);

    }

    see('/game/play')
  },

  leave: function(ctx){
  }

}

exports.Play = {
  enter: function(ctx){
    // just in case we're not already here...
    ctx.renderer.changeView("play");

    var countdown = function(nr) {
      if (nr > 0) {
        this.timeout = setTimeout(countdown, 1000, nr-1);
        $('.countdown-number').eq(nr-1).addClass('visible')
          .siblings().removeClass('visible');
      } else {
        $('.game-play').removeClass('active');
        $('.countdown-number.visible').removeClass('visible')
        keys.bind(['esc','space'], function(){ see('/game/pause') })
        ctx.game.emit('input',World.PLAY)
      }
    }.bind(this)

    // wait until we're in play view
    var offset = ctx.latency || 0;
    this.timeout = setTimeout(function(){
      countdown(3)
    }, 1000 - offset);
  },


  leave: function(ctx){
    clearTimeout(this.timeout);
    keys.unbind('esc')
    keys.unbind('space')
    ctx.game.emit('input',World.PAUSE)
  }
}


exports.Pause = {
  enter: function(ctx){
    $('.play-friend',ctx.el)
      .toggle(!ctx.multiplayer) // hidden if we already play in multiplayer
      .on('click',function(){ see('/friend/invite') })

    // TODO listen if the other player resumes the game
    //      when in multiplayer

    $('.play',ctx.el)
      .on('click',function(){ see('/game/play') })

    keys.bind('space', function(){ see('/game/play') })
  },
  leave: function(ctx){
    keys.unbind('space')
    $('.play-friend',ctx.el).off('click');
    $('.play',ctx.el).off('click');
  }
}

exports.Next = {

  enter: function(ctx){
    var world = ctx.game.world;

    // TODO is game is over? then destroy opponent and go to /game/over
    if( world.over ){
      console.log('GAME OVER MAN, GAME OVER!')

      // TODO explode the loser! (then game over)

      see('/game/over');


    // TODO is round over? then distort opponent, update the scores and go to /game/start
    } else {
      // TODO distort the hit one

      // update the scores
      updateScores(world)

      // restart after 3 seconds
      setTimeout(see,3000,'/game/start')
    }
  },


  leave: function(ctx){

  }

}


exports.Over = {
  enter: function(ctx){
    $("#scoreboard-multi").toggle(!!ctx.multiplayer)
    $("#scoreboard-single").toggle(!ctx.multiplayer)
    $("#highscore-rally").html( ctx.game.world.maxAlive )
    $('#scores').hide()

    $('.play-friend',ctx.el)
      .attr('disabled',!ctx.multiplayer)
      .on('click',function(){ see('/friend/invite') })

    function restart(){
      if(!ctx.multiplayer){
        see('/game/start')
      } else {
        // TODO check ctx.network.pathname
        console.error('multiplayer restart not implemented')
      }
      return false;
    }

    keys.bind('space',restart)
    $('.game-over .play').on('click',restart)

    ctx.renderer.triggerEvent("gameOver");
    ctx.renderer.changeView("gameOver");
  },

  leave: function(ctx){
    keys.unbind('space')
    $('.game-over .play').off('click')
    $('#scores').show()
  }
}

function startGame(game,local,withPuck){
  // ctx.networkGame is not available in mobile
  if( !game ) return;

  var world = game.world;

  // reset the game
  var keepScores = !world.over;
  game.reset(keepScores);

  // easy player access
  world.me = local ? world.players.a : world.players.b;
  world.opponent = local ? world.players.b : world.players.a;

  // create paddles
  world.players.a.paddle = actions.createPaddle(world,world.players.a);
  world.players.b.paddle = actions.createPaddle(world,world.players.b);

  // create shields
  actions.createShields(world,world.players.a)
  actions.createShields(world,world.players.b)

  // create puck
  if( withPuck )
    actions.puckCreateCenter(world)
}


function updateScores(world){
  $('#scores li').addClass('active')
  $('#scores .singleplayer .player li').slice(world.me.score).removeClass('active');
  $('#scores .singleplayer .opponent li').slice(world.opponent.score).removeClass('active');
  $('#scores .multiplayer .player li').slice(world.me.score).removeClass('active');
  $('#scores .multiplayer .opponent li').slice(world.opponent.score).removeClass('active');
}

function setupLevels(ctx,game){
  // ctx.networkGame is not available in mobile
  if( !game ) return;
  game.puppeteer.on('change',function(level){
    // keep a reference to the current level in world
    // (it's just easier in the actions this way)
    game.world.level = this.levels[level]
    settings.changeTheme(game.world.level.theme)

    $("#level").html(level+1);

    // restart game
    if( !game.replaying && ctx.pathname == '/game/play' )
      see('/game/start')
  })

  // debug shortcut
  var RE_DBG_LEVEL = /[&?]level=(\d+)/g;
  if( RE_DBG_LEVEL.exec(window.location.href) ){
    var level = parseInt(RegExp.$1)-1;
    console.log('DEBUG LEVEL',level)
     game.puppeteer.goto(level)
  } else {
     game.puppeteer.goto(0)
  }
}


// [frame,type,args...,frame,type,args...]
var localQueue = []
  , networkQueue = []

function networkInput(ctx){
  var network = ctx.network;

  keys.bind('f',function(){
    forward(ctx.networkGame,ctx.game.world.frame)
  })

  keys.bind('i',function(){
    network.remote.signal.send({
      type:'inputhash',
      hashcode: ctx.networkGame.inputs.hashCode()
    })
  })
  network.remote.on('inputhash',function(e){
    console.log('inputhash')
    console.log(' remote:',e.hashcode)
    console.log('  local:',ctx.networkGame.inputs.hashCode())
    // if( e.hashcode !== ctx.networkGame.world.hashCode() )
    //   throw new Error('out of sync :(')
    // TODO pause/warn and run a full replay
  })

  keys.bind('h',function(){
    network.remote.signal.send({
      type:'hashcode',
      hashcode: ctx.networkGame.world.hashCode()
    })
  })
  network.remote.on('hashcode',function(e){
    console.log('hashcode')
    console.log(' remote:',e.hashcode)
    console.log('  local:',ctx.networkGame.world.hashCode())
    // if( e.hashcode !== ctx.networkGame.world.hashCode() )
    //   throw new Error('out of sync :(')
    // TODO pause/warn and run a full replay
  })

  // a test which should restart from the beginning
  // (it shouldn't really be noticed)
  keys.bind('r',function(){
    replay()
  })
  keys.bind('t',function(){
    network.remote.signal.send({type:'replay'})
  })
  network.remote.on('replay',function(){
    replay();
  })


  ctx.game.on('post update',function(){
    $('#scores .frame').html('l: '+ctx.game.world.frame+' n: '+ctx.networkGame.world.frame)
    network.game.flush()
  })

  // if( !network.winner ){
  //   setInterval(function(){
  //     // test to run some input
  //     ctx.game.emit('input',World.MOVE,ctx.game.world.me.paddle,1)
  //   },200)
  // } else {
  //   setInterval(function(){
  //     // test to run some input
  //     ctx.game.emit('input',World.MOVE,ctx.game.world.me.paddle,-2)
  //   },500)
  // }

  // setInterval(replay,1000)

  keys.bind(',',function(){
    var diff = actions.debugDiff(ctx.game.world);
    console.log(diff)
  })

  keys.bind('c',function(){
    var diff = actions.debugDiff(ctx.networkGame.world);
    network.remote.signal.send({type:'diff',diff: diff})
  })

  network.remote.on('diff',function(e){
    actions.debugDiff(ctx.networkGame.world,e.diff)
  })

  // sending input
  ctx.game.on('apply',function(world,inputs,size){
    if( !size ) return;
    if( this.replaying ) return;
    var buf = new ArrayBuffer(2+size);
    var data = new buffer.Writer(buf);
    data.setUint16(world.frame);
    for(var i=0; i < inputs.length;) {
      var type = inputs[i++];
      data.setInt8(type);
      switch(type){
        case World.MOVE:
          var p = inputs[i++];
          var x = inputs[i++];
          data.setUint8(p);
          data.setFloat32(x);
          console.log('%s local move',world.frame,p,x)
          localQueue.push(world.frame,type,p,x)
          break;
        case World.SHOOT:
          var p = inputs[i++];
          data.setUint8(p);
          console.log('%s local shoot',world.frame,p)
          localQueue.push(world.frame,type,p)
          break;
        case World.PAUSE:
          console.log('%s local pause',world.frame)
          localQueue.push(world.frame,type)
          break;
        case World.PLAY:
          console.log('%s local play',world.frame)
          localQueue.push(world.frame,type)
          break;
        case World.OVER:
          console.log('%s local over',world.frame)
          localQueue.push(world.frame,type)
          break;
        default:
          console.error('unknown type',type)
          return null;
      }
    }
    network.send(buf);

    forward(ctx.networkGame,world.frame) && replay()
  })

  // prebuild an ACK packet
  var ack = new ArrayBuffer(3);
  var ackData = new DataView(ack);
  ackData.setInt8(2,World.ACK);

  // receiving input
  network.on('message',function(buf){
    var data = new buffer.Reader(buf);
    var frame = data.getUint16()
    var sendAck = true;

    console.log('got message from frame %s',frame)

    while(data.offset < buf.byteLength){
      var type = data.getInt8();
      switch(type){
        case World.ACK:
          console.log('%s ack',frame)
          sendAck = false
          break;
        case World.MOVE:
          var p = data.getUint8();
          var x = data.getFloat32();
          console.log('%s network move',frame,p,x)
          networkQueue.push(frame,type,p,x)
          break;
        case World.SHOOT:
          var p = data.getUint8();
          console.log('%s network shoot',frame,p)
          networkQueue.push(frame,type,p)
          break;
        case World.PAUSE:
          console.log('%s network pause',frame)
          networkQueue.push(frame,type)
          break;
        case World.PLAY:
          console.log('%s network play',frame)
          networkQueue.push(frame,type)
          break;
        case World.OVER:
          console.log('%s network over',frame)
          networkQueue.push(frame,type)
          break;
        default:
          console.error('invalid network input')
          return false;
      }
    }

    forward(ctx.networkGame,frame) && replay()
  })

  function replay(){
    replay2(ctx.networkGame,ctx.game,localQueue.concat(),networkQueue.concat())
  }
}

function forward(game,frame){
  // console.log('forward to',frame)
  // update the networkGame with both
  // local and network input until it's
  // `world.frame == frame`
  if( !networkQueue.length ){
    console.log('skipping forwarding, no network events');
    return false;
  }

  console.log('forwarding %s to %s',game.world.frame,frame)
  // console.log('  l:',localQueue)
  // console.log('  n:',networkQueue)

  var fwd = false;
  var steps = frame - game.world.frame;
  for(var i=0; i < steps; i++ ){
    // check if there's any queued local inputs to
    // be applied.
    fwd = true;
    checkQueue('l',localQueue,game)
    checkQueue('n',networkQueue,game)
    game.update();
  }
  if( fwd ){
    console.log('forwarded %s to %s',game.world.name,game.world.frame)
    // console.log('  l:',localQueue)
    // console.log('  n:',networkQueue)
  } else {
    console.log('  no forwarding n: %s l: %s',networkQueue[0],frame)
  }
  return fwd;
}

function replay2(fromGame,toGame,localQueue,networkQueue){
  var steps = toGame.world.frame - fromGame.world.frame;

  console.log('replaying %s to %s',fromGame.world.frame,toGame.world.frame)
  // console.log('  l:',localQueue)
  // console.log('  n:',networkQueue)

  toGame.replaying = true;
  settings.data.sounds = false;
  toGame.world.copy(fromGame.world);
  toGame.inputs.copy(fromGame.inputs);

  for(var i=0; i < steps; i++){
    checkQueue('l',localQueue,toGame)
    checkQueue('n',networkQueue,toGame)
    toGame.update();
  }
  console.log('replayed %s to %s',toGame.world.name,toGame.world.frame)
  // console.log('  l:',localQueue)
  // console.log('  n:',networkQueue)
  toGame.replaying = false;
}

function checkQueue(name,q,game){
  // console.log('check %s queue %s == %s?',name,q[0],game.world.frame)
  while( q[0] === game.world.frame ){
    var frame = q.shift()
      , type = q.shift();
    switch(type){
      case World.MOVE:
        var p = q.shift();
        var x = q.shift();
        console.log('%s queued move',frame,p,x)
        game.emit('input',type,p,x)
        break;
      case World.SHOOT:
        var p = q.shift();
        console.log('%s queued shoot',frame,p)
        game.emit('input',type,p)
        break;
      case World.PAUSE:
        console.log('%s queued pause',frame)
        game.emit('input',type)
        break;
      case World.PLAY:
        console.log('%s queued play',frame)
        game.emit('input',type)
        break;
      case World.OVER:
        console.log('%s queued over',frame)
        game.emit('input',type)
        break;
      default:
        console.error('unknown type in queue',type)
    }
  }
}
