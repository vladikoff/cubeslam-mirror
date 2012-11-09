var Force = require('./sim/force')
  , Point = require('./sim/point')
  , PointMass = require('./sim/point-mass')
  , Rect = require('./sim/rect')
  , diff = require('./support/diff')
  , inspect = require('./support/inspect')
  , audio = require('./audio')
  , world = require('./world')
  , debug = require('debug')('actions')

// helper to convert arguments to array
function slice(args,pos){ return [].slice.call(args,pos || 0); }


exports.paddleMove = function(i, x){
  // inverted when host and index is 0
  world.paddles[i].x = i == 1 ? 1-x : +x;

  // send it as unreliable (no frame) when it's my movement
  if( (world.host && i == 0) || (!world.host && i == 1) )
    buffer.push(['m', slice(arguments)])
}



exports.puckPush = function(id, x, y){
  debug('puck push [%s] %s,%s',id, x, y)

  if( !world.pucks[id] )
    throw new Error('cannot push puck, does not exist yet');
  else
    world.pucks[id].applyForce(+x,+y);

  // send it as reliable if host
  if( world.host )
    buffer.push(['pp',world.frame, slice(arguments)])
}


exports.puckCreate = function(x, y, mass){
  debug('puck create [%s] %s,%s %s',world.pucks.length, x, y, mass)

  var puck = new PointMass(+x,+y,+mass);
  puck.id = world.pucks.length;
  puck.bounds = new Rect(0,1,1,0);
  // TODO refactor into puck.oncollision = function()
  puck.onbounds = function(at){

    // TODO probably refactor into hitA(), missA(), hitB(), missB(), hitWall()?

    var player = null;

    if( at.y <= 0 ) 
      player = world.players.b;
    else if( at.y >= 1 )
      player = world.players.a;

    if( player ){

      var x = Math.min( 1, Math.max( 0, player.paddle.x ) )
        , hw = player.paddle.width / 2;

      debug('hit [%s] %s %s>%s<%s',puck.id,player.name,x-hw,at.x,x+hw)
      
      if( at.x >= x - hw && at.x <= x + hw ){
        debug(' - paddle')

        // push the ball depending on where on the paddle it hit
        var diff = at.x-x
          , force = diff/hw * 40;

        // only the host updates scores and modifies the world
        if( world.host ){
          exports.puckPush(puck.id, force, 0)
          exports.scoreAlive()
        }

        audio.play3D("hit2", new THREE.Vector3((puck.current.x-.5)*-0.8,0,puck.current.y*10));

        //don't hardcode event name?
       
      } else {
        debug(' - shield')

        // only the host updates scores and modifies the world
        if( world.host ){
          exports.scoreReset()

          if( player === world.players.a ) {
            world.renderer.triggerEvent("hit", { side:0} );
            exports.scoreB(at.x);
          }
          else if( player === world.players.b ) {
            world.renderer.triggerEvent("hit", { side:1} );
            exports.scoreA(at.x)
          }

        }

        

        audio.play3D("miss", new THREE.Vector3((puck.current.x-.5)*-0.8,0,puck.current.y*10));
      }

      //audio.playFx3D("hit", new THREE.Vector3((puck.current.x-.5)*-0.8,0,puck.current.y*10));
    }
    
  }
  world.pucks.push(puck);

  // send it as reliable if host
  if( world.host )
    buffer.push(['pc', world.frame, slice(arguments)])
}


function forceCreate(kind, x, y, mass){
  if( !world.host && !mass ) 
    throw new Error('cannot create a force without a mass') 
  
  var force = new Force(kind,new Point(+x,+y));
  force.mass = +mass || 1+Math.random()*5;
  world.forces.push(force);

  // send it as reliable if host
  if( world.host )
    buffer.push(['f'+kind[0], world.frame, slice(arguments)])
}
exports.forceRepell = function(x, y, mass){
  forceCreate('repell',x,y,mass);
}
exports.forceAttract = function(x, y, mass){
  forceCreate('attract',x,y,mass);
}

exports.scoreAlive = function(){
  world.alive++;
  debug('score alive',world.alive)
  
  // send it as reliable if host
  if( world.host )
    buffer.push(['sl', world.frame, slice(arguments)])
}


exports.scoreReset = function(){
  debug('score reset',world.alive)
  world.players.a.score += world.alive;
  world.players.b.score += world.alive;
  world.alive = 0;

  // send it as reliable if host
  if( world.host )
    buffer.push(['sr', world.frame, slice(arguments)])
}

exports.scoreA = function(x){
  debug('score a',x)
  world.players.a.score++;
  world.players.a.hits.push(+x)

  if( world.players.a.hits.length > 3 ) {
    world.players.a.hits = []
  }

  // send it as reliable if host
  if( world.host )
    buffer.push(['sa', world.frame, slice(arguments)])
}

exports.scoreB = function(x){
  debug('score x',x)
  world.players.b.score++;
  world.players.b.hits.push(+x)

  if( world.players.b.hits.length > 3 ) {
    world.players.b.hits = []
  }

  // send it as reliable if host
  if( world.host )
    buffer.push(['sb', world.frame, slice(arguments)])
}

exports.debugDiff = function(remoteState){
  var remoteState = remoteState && remoteState.replace(/\\n/g,'\n')

  // temporary remove some uninteresting references
  var renderer = world.renderer
    , me = world.me
    , host = world.host;
  delete world.renderer;
  delete world.me;
  var localState = inspect(world,{depth:Infinity});
  world.renderer = renderer;
  world.me = me;
  world.host = host;

  // received a state from other player
  if( remoteState ){
    console.log('got a remote state')
    console.log(diff.createPatch('diff',remoteState,localState))
    
  // sending state reliably to other player
  } else {
    console.log('sending debug diff! %d ',world.frame)
    buffer.push(['dd', world.frame, [localState.replace(/\n/mg,'\\n')]])
  }
}



// TODO optimize by grouping by frame number 
// (not necessary just now though as it's sent once every controls() anyway)

var buffer = [];
buffer.flush = function(channel){
  var unrel = {}
    , skipped = 0;

  // strip any extra unreliable messages
  for( var i=buffer.length-1; i >= 0; i-- ){
    var msg = buffer[i];

    // unreliable
    if( msg.length == 3 ){
      // already found one of this type so remove it
      if( unrel[msg[0]] ){ 
        buffer[i] = buffer.pop();
        skipped++;
      } else {
        unrel[msg[0]] = msg;
      }
    }

    // "serialize" the options
    // note: not a regular comma (alt-comma)
    msg[msg.length-1] = msg[msg.length-1].join('‚')

    // update buffer with string message
    // note: alt-shift-period
    buffer[i] = msg.join('·'); 
  }

  // any left?
  if( buffer.length ){
    // send all messages, separated by newline
    channel.send(buffer.join('\n'));

    // console.log('sent %d messages, skipped %d unreliable messages',buffer.length,skipped);

    // reset buffer
    buffer.length = 0;
  }
}

exports.flush = buffer.flush.bind(buffer);

exports.parse = function(msg){
  debug('parse %s',msg)
  var RE_ACTION = /(\w{1,2})·(?:(\d+)·)?(.+)$/gm  // note: alt-shift-period
    , md
    , parsed = 0
  while( md = RE_ACTION.exec(msg) ){
    var type = md[1]
      , frame = +md[2]
      , opts = md[3].split('‚'); // note: not a regular comma (alt-comma)

    if( frame ){
      createAt.apply(this,[frame,type].concat(opts))
    } else {
      create.apply(null,[type].concat(opts))
    }
    parsed++;
  }
  debug('parsed %d messages',parsed)
}

function create(type /*, ... */){
  var action = exports[type];
  debug('create[%d] %s',world.frame, type);
  exports[type].apply(null, slice(arguments,1))
}

function createAt(frame, type /*, ...*/){
  var currentFrame = world.frame;
  debug('createAt[%d:%d] %s',frame,currentFrame, type);
  this.physics.goto(world,frame)
  create.apply(null,slice(arguments,1))
  this.physics.goto(world,currentFrame)
}

function destroy(){
  // TODO
}



// aliases
exports.m = exports.paddleMove;
exports.pp = exports.puckPush;
exports.pc = exports.puckCreate;
exports.fr = exports.forceRepell;
exports.fa = exports.forceAttract;
exports.sl = exports.scoreAlive;
exports.sa = exports.scoreA;
exports.sb = exports.scoreB;
exports.sr = exports.scoreReset;
exports.dd = exports.debugDiff;
