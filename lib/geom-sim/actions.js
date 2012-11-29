var geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , Force = require('./force')
  , diff = require('../support/diff')
  , inspect = require('../support/inspect')
  , audio = require('../audio')
  , world = require('../world')
  , Extras = require('../extras')
  , debug = require('debug')('actions')
  , settings = require('../settings');

// helper to convert arguments to array
function slice(args,pos){ return [].slice.call(args,pos || 0); }

// End Of Packet, used to signify the end of a message
// without wrapping each message in an array.
function EOP(){};

exports.paddleMove = function(i, x){
  // debug('paddle move [%s] %s',i, x)
  if( !world.paddles[i] ){
    return console.warn('paddle move, no paddle %s was found (too early?)',i)
  }

  var p = world.paddles[i]
    , w = p.aabb[1] - p.aabb[3]
    , hw = w/2;

  // clamp to the area
  p.current[0] = Math.max(hw,Math.min(1-hw,+x));
  vec.copy(c.current,c.previous) // don't gain velocity

  // send it as unreliable (no frame) when it's my movement
  if( (world.host && i == 0) || (!world.host && i == 1) ){
    buffer.push('m',-1)
    buffer.push.apply(buffer,arguments)
    buffer.push(EOP)
  }
}



exports.puckPush = function(id, x, y){
  debug('puck push [%s] %s,%s',id, x, y)

  if( !world.pucks[id] )
    throw new Error('cannot push puck, does not exist yet');
  else
    world.pucks[id].applyForce(+x,+y);

  // send it as reliable if host
  if( world.host ){
    buffer.push('pp', world.frame)
    buffer.push.apply(buffer,arguments)
    buffer.push(EOP)
  }
}


exports.puckCreate = function(x, y, mass){
  debug('puck create [%s] %s,%s %s',world.pucks.length, x, y, mass)

  var puck = new Body(shapes.rect(mass/2),+x,+y);
  puck.id = world.pucks.length;
  var p = puck;
  puck.oncollision = function oncollision(q,c){
    debug('puck[%s] collision',puck.id);

    // offset to avoid intersection
    if( !p.fixed ){
      var t = vec.make()
      vec.add(p.v,c.minTranslationVector,t)
      vec.add(p.c,c.minTranslationVector,p.c)
      vec.free(t)
    }

    if( q.shape === paddle ){
      var I = vec.norm(p.v)
        , n = vec.perp(c.nearestEdge)
        , r = vec.reflect(I,vec.norm(n,n))
        , l = vec.len(p.v);
      // divide the diff w. width to get the x normal
      r[0] = (p.c[0] - q.c[0])/20
      vec.smul(vec.norm(r,r),l,r)
      vec.sub(p.c,r,p.p)
      vec.free(r)
      vec.free(I)
      vec.free(n)


    } else if( !p.fixed ){
      var I = vec.norm(p.v)
        , n = vec.perp(c.nearestEdge)
        , r = vec.reflect(I,vec.norm(n,n));
      var l = vec.len(p.v)
      vec.smul(r,l,r)
      vec.sub(p.c,r,p.p)
      vec.free(r)
      vec.free(I)
      vec.free(n)
    }

    world.collisions++
  }

  puck.bounds = [0,1,1,0];
  puck.onbounds = function onbounds(b){
    // offset b to avoid intersection
    vec.add(p.c, b, p.c)

    // flip velocity by adding it to current
    // (moving the previous ahead)
    if( b[0] ) p.p[0] = p.c[0] + p.v[0]
    if( b[1] ) p.p[1] = p.c[1] + p.v[1]

    vec.free(b)


    // TODO check for player
    return;

    var player = null;
    if( at.y <= 0 )
      player = world.players.b;
    else if( at.y >= 1 )
      player = world.players.a;

    if( player ){

      debug('puck[%s] bounds hit %s',puck.id,player.name)

      // only the host updates scores and modifies the world
      if( world.host ){
        exports.scoreReset()

        if( player === world.players.a )
          exports.scoreB(at.x);
        else if( player === world.players.b )
          exports.scoreA(at.x)
      }

      audio.play3D("miss", new THREE.Vector3((puck.current.x-.5)*-0.8,0,(1-puck.current.y)*10));
    }

    world.collisions++
  }
  world.pucks.push(puck);
  world.bodies.push(puck);

  // send it as reliable if host
  if( world.host ){
    buffer.push('pc', world.frame)
    buffer.push.apply(buffer,arguments)
    buffer.push(EOP)
  }
}

exports.obstacleCreate = function(id){
  var extra = Extras.get(id);

  if( extra ){
    // TODO

    // send it as reliable if host
    if( world.host ){
      buffer.push('oc', world.frame)
      buffer.push.apply(buffer,arguments)
    buffer.push(EOP)
    }
  }
}

function forceCreate(kind, x, y, mass){
  if( !world.host && !mass )
    throw new Error('cannot create a force without a mass')

  // TODO

  // send it as reliable if host
  if( world.host ){
    buffer.push('f'+kind[0], world.frame)
    buffer.push.apply(buffer,arguments)
    buffer.push(EOP)
  }
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
  if( world.host ){
    buffer.push('sl', world.frame)
    buffer.push.apply(buffer,arguments)
    buffer.push(EOP)
  }
}


exports.scoreReset = function(){
  debug('score reset',world.alive)
  world.players.a.score += world.alive;
  world.players.b.score += world.alive;
  world.alive = 0;

  // send it as reliable if host
  if( world.host ){
    buffer.push('sr', world.frame)
    buffer.push.apply(buffer,arguments)
    buffer.push(EOP)
  }
}

exports.scoreA = function(x){
  debug('score a',x)
  world.players.a.score++;
  world.players.a.hits.push(+x)
  world.renderer.triggerEvent("hit", {player: "a"});

  if( world.players.a.hits.length == settings.data.maxHits ) {
    world.players.a.hits.length = 0;
    world.renderer.triggerEvent("resetShield", {player: "a"});
    return world.host && exports.gameOver();
  }

  // send it as reliable if host
  if( world.host ){
    buffer.push('sa', world.frame)
    buffer.push.apply(buffer,arguments)
    buffer.push(EOP)
  }
}

exports.scoreB = function(x){
  debug('score x',x)
  world.players.b.score++;
  world.players.b.hits.push(+x)
  world.renderer.triggerEvent("hit", {player: "b"});

  if( world.players.b.hits.length === settings.data.maxHits ) {
    world.players.b.hits.length = 0;
    world.renderer.triggerEvent("resetShield", {player: "b"});
    return world.host && exports.gameOver();
  }

  // send it as reliable if host
  if( world.host ){
    buffer.push('sb', world.frame)
    buffer.push.apply(buffer,arguments)
    buffer.push(EOP)
  }
}

exports.debugDiff = function(remoteState){
  var remoteState = remoteState && remoteState.replace(/\\n/g,'\n')
  var localState;

  // temporary remove some uninteresting references
  var ignore = ['renderer','me','opponent','host','players.a.paddle','players.b.paddle']
  exclude(world,ignore,function(world){
    localState = inspect(world,{depth:Infinity});
  })

  // received a state from other player
  if( remoteState ){
    console.log('got a remote state')
    console.log(diff.createPatch('diff',remoteState,localState))

  // sending state reliably to other player
  } else {
    console.log('sending debug diff! %d ',world.frame)

    buffer.push('dd', world.frame)
    buffer.push(localState.replace(/\n/mg,'\\n'),EOP)
  }
}


exports.gamePause = function(){
  debug('game pause')
  world.paused = true;
  buffer.push('gp', world.frame,EOP)
}

exports.gameResume = function(){
  debug('game resume')
  world.paused = false;
  buffer.push('gr', world.frame,EOP)
}

exports.gameOver = function(){
  debug('game over')
  world.over = true;
  buffer.push('go', world.frame,EOP)
}

// TODO optimize by grouping by frame number
// (not necessary just now though as it's sent once every controls() anyway)

var buffer = []
  , msg = []
  , opts = []
  , msgs = []
  , unrel = [];
buffer.flush = function(channel){
  if( !channel ){
    debug('flush without channel')
    buffer.length = 0;
    return;
  }

  var skipped = 0
    , l = buffer.length
    , i = 0;

  msgs.length = 0;
  unrel.length = 0;

  // buffer = [type,frame,args,EOP,type,frame,args,EOP...]

  // strip any extra unreliable messages
  while(i < l){
    msg.length = 0;
    opts.length = 0;

    // find the ones in this message
    // so loop until EOP
    while(buffer[i] != EOP){
      if( msg.length < 2 )
        msg.push(buffer[i]);
      else
        opts.push(buffer[i]);
      i++
    }
    i++ // skip the EOP

    // unreliable
    if( msg[1] === -1 ){
      // already found one of this type so skip it
      if( ~unrel.indexOf(msg[0]) ){
        skipped++;
        continue;
      } else {
        unrel.push(msg[0]);
      }
    }

    // "serialize" the opts
    // note: not a regular comma (alt-comma)
    msg.push(opts.join('‚'));

    // update buffer with string message
    // note: alt-shift-period
    msgs.push(msg.join('·'));
  }

  // any left?
  if( buffer.length ){
    // send all messages, separated by newline
    channel.send(msgs.join('\n'));

    // console.log('sent %d messages, skipped %d unreliable messages',buffer.length,skipped);

    // reset buffers
    buffer.length = 0;
  }
}

exports.flush = buffer.flush.bind(buffer);

var RE_ACTION = /(\w{1,2})·(?:(\d+)·)?(.+?)$/gm;  // note: alt-shift-period

function parse(msg,fn){
  msg.split('\n').forEach(function(msg){
    var parts = msg.split('·');
    if( parts.length > 1 )
      fn(parts[0], parts[1] !== '-1' ? +parts[1] : null, parts[2] ? parts[2].split('‚') : null)
  })
}

exports.parse = function(msg){
  debug('parse %s',msg)
  var md
    , parsed = 0
    , withFrame = [] // needs rewind (TODO opt: these can be reused)
    , noFrame = [];

  parse(msg,function(type,frame,opts){
    if( frame !== null ){
      if( withFrame.frame && frame !== withFrame.frame ){
        console.error('can only handle actions sent during the same frame (this shouldnt happen) [skipping]',withFrame.frame,frame)
      } else {
        withFrame.push([type].concat(opts))
        withFrame.frame = frame
      }
    } else {

      // console.error('there should be no unframed messages at the moment',msg)
      noFrame.push([type].concat(opts))
    }

    parsed++
  })

  debug('parsed %s messages (%s framed, %s unframed)',parsed,withFrame.length, noFrame.length)

  if( withFrame.length ){
    // 0. store current frame
    var currentFrame = world.frame;

    // 1. rewind
    this.physics.goto(withFrame.frame,world)

    // 2. apply actions
    var i = 0;
    while( i < withFrame.length )
      create.apply(null,withFrame[i++])

    // 3. ffw
    this.physics.goto(currentFrame,world)
  }

  // always apply un framed packets (if any)
  while( noFrame.length )
    create.apply(null,noFrame.pop())
}

function create(type /*, ... */){
  var action = exports[type];
  debug('create[%d] %s',world.frame, type);
  exports[type].apply(null, slice(arguments,1))
}

function destroy(){
  // TODO
}



// aliases
exports.m = exports.paddleMove;
exports.pp = exports.puckPush;
exports.pc = exports.puckCreate;
exports.oc = exports.obstacleCreate;
exports.fr = exports.forceRepell;
exports.fa = exports.forceAttract;
exports.sl = exports.scoreAlive;
exports.sa = exports.scoreA;
exports.sb = exports.scoreB;
exports.sr = exports.scoreReset;
exports.dd = exports.debugDiff;
exports.gp = exports.gamePause;
exports.gr = exports.gameResume;
exports.go = exports.gameOver;





// temporary excludes properties in `obj` defined in `excluded`
// calls fn with the obj and then adds the properties back after
// the callback.
function exclude(obj,excluded,fn){
  var map = {}
  excluded.forEach(function(prop){
    var props = prop.split('.');
    var tmp = obj;
    for (var i = 0; i < props.length; ++i) {
      var name = props[i];
      if( i == props.length-1 ){
        map[prop] = tmp[name]
        delete tmp[name]
      } else {
        tmp = tmp[name];
      }
    }
  })
  fn(obj)
  Object.keys(map).forEach(function(prop){
    var props = prop.split('.');
    var tmp = obj;
    for (var i = 0; i < props.length; ++i) {
      var name = props[i];
      if( i == props.length-1 ){
        tmp[name] = map[prop];
      } else {
        tmp = tmp[name];
      }
    }
  })
}

