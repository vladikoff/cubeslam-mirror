var geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , Force = require('./force')
  , Body = require('./body')
  , shapes = require('./shapes')
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
    , hw = w/2
    , aw = settings.data.arenaWidth;

  // clamp to the area
  // and don't gain velocity
  p.current[0] = p.previous[0] = Math.max(hw,Math.min(aw-hw,(+x)*aw));

  // send it as unreliable (no frame) when it's my movement
  if( (world.host && i == 0) || (!world.host && i == 1) ){
    buffer.push('m',-1)
    buffer.push.apply(buffer,arguments)
    buffer.push(EOP)
  }
}

exports.puckSpeed = function(id, x,y){
  debug('puck speed [%s]',id, x,y)
  var p = world.pucks[+id];

  if( !p )
    throw new Error('cannot set puck speed, does not exist yet');

  // only a speed (in the current direction)
  var v = vec.make()
  if( arguments.length == 2 ){
    vec.sub(p.current,p.previous,v)
    vec.norm(v,v)
    vec.smul(v,+x,v)

  // with a direction
  } else {
    v[0] = +x
    v[1] = +y

  }

  vec.sub(p.current,v,p.previous)
  vec.free(v)

  // send it as reliable if host
  if( world.host ){
    buffer.push('ps', world.frame)
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

exports.puckSync = function(/*cx0,cy0,px0,py0,cx1,cy1,px1,py1...*/){
  debug('puck sync')

  // send the positions of all the pucks
  if( !arguments.length ){
    buffer.push('pa', world.frame)
    for(var i=0; i < world.pucks.length; i++ ){
      var p = world.pucks[0];
      buffer.push(p.current[0],p.current[1],p.previous[0],p.previous[1]);
    }
    buffer.push(EOP)


  // apply the positions of the pucks
  } else {
    var id = 0;
    for(var i=0; i < arguments.length; i+=4){
      var cx = +arguments[i+0]
        , cy = +arguments[i+1]
        , px = +arguments[i+2]
        , py = +arguments[i+3]
        , p  = world.pucks[id];
      p.current[0] = cx;
      p.current[1] = cy;
      p.previous[0] = px;
      p.previous[1] = py;
      id++
    }
  }
}

exports.puckCreate = function(x, y, mass){
  debug('puck create [%s] %s,%s %s', world.pucks.length, x, y, mass)

  var w = settings.data.puckRadius*2
    , h = w; // square
  var puck = new Body(shapes.rect(w,h),+x,+y);
  puck.id = world.pucks.length;
  var p = puck;
  console.log('created puck',w,h,x,y)
  puck.oncollision = function oncollision(q,c){
    debug('puck[%s] collision',puck.id);

    var hitExtra = ~world.extras.indexOf(q);

    // offset to avoid intersection
    if( !p.fixed && !hitExtra ){
      var t = vec.make()
      vec.add(p.velocity,c.minTranslationVector,t)
      vec.add(p.current,c.minTranslationVector,p.current)
      vec.free(t)
    }

    // hit a paddle
    if( ~world.paddles.indexOf(q) ){
      // divide the diff w. width to get the x normal
      var I = vec.norm(p.velocity)
        , n = vec.perp(c.nearestEdge)
        , r = vec.reflect(I,vec.norm(n,n))
        , l = vec.len(p.velocity)
        , d = (p.current[0] - q.current[0])/(q.aabb[1]-q.aabb[3]);

      // normalizing again to avoid any additional velocity
      r[0] = d
      vec.smul(vec.norm(r,r),l,r)

      vec.free(r)
      vec.free(I)
      vec.free(n)

      // update puck positions
      vec.sub(p.current,r,p.previous)

      if( world.host ){

        // update again (this time also over the network)
        exports.paddleHit(puck.id,p.current[0],p.current[1],p.previous[0],p.previous[1])

        // we've been kept alive!
        exports.scoreAlive()

        // add some extra power to each hit
        // level.speed * (1 + world.alive * level.speedup)
        // 10 * (1 + 0 * .1) = 10
        // 10 * (1 + 1 * .1) = 11 // +10% from level base
        // 10 * (1 + 2 * .1) = 12 // +20% from level base
        // 10 * (1 + 5 * .1) = 15 // +50% from level base
        // etc.
        var speed = world.level.speed * (1 + world.alive * world.level.speedup);
        // TODO add puck-specific speed? (that can be "upgraded" using speedball extra)
        exports.puckSpeed(puck.id, speed);

      } else {

        // ignored, waiting for a message from host

      }

      world.renderer.triggerEvent("paddleHit", {player: q.id==0?"a":"b", velocity:puck.velocity});

    // hit an extra.
    } else if( hitExtra ){

      if( world.host ){

        // remove extra
        exports.extraDestroy(q.id)

        // do extra specific things depending on
        // extra.id (like speed up, add puck etc)
        switch(q.id){
          case 'speedball':
            console.log('TODO SPEED UP!')
            break;

          case 'extraball':
            // create a new puck a bit behind the
            // old puck to avoid collisions
            var dir = vec.norm(p.velocity)
              , len = vec.len(p.velocity)
            vec.smul(dir,len*10,dir)
            vec.sub(p.previous,dir,dir)
            exports.puckCreate(dir[0],dir[1],p.mass)
            vec.free(dir)

            // then push both pucks in 45° offsets
            var lastPuck = world.pucks[world.pucks.length-1];
            var a = vec.rot(p.velocity, Math.PI/4) // v + 45°
            var b = vec.rot(p.velocity,-Math.PI/4) // v - 45°
            exports.puckSpeed(lastPuck.id,a[0],a[1])
            exports.puckSpeed(p.id,b[0],b[1])
            vec.free(a)
            vec.free(b)
            break;
        }

      } else {

        // ignored, waiting for a message from host

      }


    // hit something that's not a paddle or an extra
    // and not fixed (so it should bounce away). like
    // a puck or an obstacle.
    } else if( !p.fixed ){
      var I = vec.norm(p.velocity)
        , n = vec.perp(c.nearestEdge)
        , r = vec.reflect(I,vec.norm(n,n));
      var l = vec.len(p.velocity)

      vec.smul(r,l,r)
      vec.sub(p.current,r,p.previous)
      vec.free(r)
      vec.free(I)
      vec.free(n)
    }

    world.collisions++
  }

  puck.onbounds = function onbounds(b){
    debug('puck[%s] bounds',puck.id);

    // first see if we hit the bounds behind
    // any player?
    var player = null;
    if( p.current[1] <= world.bounds[0] + h )
      player = 'b';
    else if( p.current[1] >= world.bounds[2]-h  )
      player = 'a';

    // offset b to avoid intersection
    vec.add(p.current, b, p.current)

    // flip velocity by adding it to current
    // (moving the previous ahead)
    if( b[0] ) p.previous[0] = p.current[0] + p.velocity[0]
    if( b[1] ) p.previous[1] = p.current[1] + p.velocity[1]

    // check for player
    if( player ){
      exports.playerHit(player,p.current[0],p.current[1]);

      // and if host, try to sync
      if( world.host ){
        exports.puckSync();
      }
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

exports.paddleHit = function(id,cx,cy,px,py){
  debug('paddle hit',id,cx,cy,px,py)
  id = +id;
  var P = world.pucks[id]
    , c = vec.make(+cx,+cy)
    , p = vec.make(+px,+py);
  vec.copy(c,P.current)
  vec.copy(p,P.previous)
  vec.free(c)
  vec.free(p)

  // position audio
  // 0 = near, -10 = far away
  if( settings.data.sounds ){
    var aw = settings.data.arenaWidth
      , ah = settings.data.arenaHeight
      , ax = P.current[0]/settings.data.arenaWidth-.5*-0.8
      , ay = (1-P.current[1]/settings.data.arenaHeight)*-10
    audio.play3D("hit2", new THREE.Vector3(ax,0,ay));
  }

  // send it as reliable if host
  if( (world.host && id == 0) || (!world.host && id == 1) ){
    buffer.push('ph', world.frame)
    buffer.push.apply(buffer,arguments)
    buffer.push(EOP)
  }
}

exports.playerHit = function(playerId,x,y){
  debug('player hit',playerId)

  // only the host updates scores and modifies the world
  if( world.host ){
    exports.scoreReset()

    if( playerId === 'a' )
      exports.scoreB(x);
    else if( playerId === 'b' )
      exports.scoreA(x)
  }

  // position audio
  // 0 = near, -10 = far away
  if( settings.data.sounds ){
    var aw = settings.data.arenaWidth
      , ah = settings.data.arenaHeight
      , ax = x/settings.data.arenaWidth-.5*-0.8
      , ay = (1-y/settings.data.arenaHeight)*-10
    audio.play3D("miss", new THREE.Vector3(ax,0,ay));
  }
}


exports.extraCreate = function(id,x,y){
  debug('extra create',id);
  var extra = Extras[id];

  // only add one of each at a time
  if( extra && !~world.extras.indexOf(extra) ){
    // move it in place
    var p = vec.make(x,y)
    vec.copy(p,extra.current)
    vec.copy(p,extra.previous)
    vec.free(p)

    world.extras.push(extra)
    world.bodies.push(extra)

    // send it as reliable if host
    if( world.host ){
      buffer.push('ec', world.frame)
      buffer.push.apply(buffer,arguments)
      buffer.push(EOP)
    }
  }
}

exports.extraDestroy = function(id){
  var extra = null
    , index = null;
  for (var i = 0; i < world.extras.length; i++) {
    if( world.extras[i].id === id ){
      extra = world.extras[i]
      index = i
      break;
    }
  }

  if( extra ){
    world.extras.splice(index,1)
    world.bodies.splice(world.bodies.indexOf(extra),1)
    world.remove.push(extra)

    // send it as reliable if host
    if( world.host ){
      buffer.push('ed', world.frame)
      buffer.push.apply(buffer,arguments)
      buffer.push(EOP)
    }
  }
}


exports.obstacleCreate = function(id,x,y){
  debug('obstacle create',id,x,y);
  var extra = Extras[id];

  // only add one of each at a time
  if( extra && !~world.obstacles.indexOf(extra) ){
    // move it in place
    var p = vec.make(+x,+y)
    vec.copy(p,extra.current)
    vec.copy(p,extra.previous)
    vec.free(p)

    world.obstacles.push(extra)
    world.bodies.push(extra)

    // send it as reliable if host
    if( world.host ){
      buffer.push('oc', world.frame)
      buffer.push.apply(buffer,arguments)
      buffer.push(EOP)
    }
  }
}

exports.obstacleDestroy = function(id){
  var extra = null
    , index = null;
  for (var i = 0; i < world.obstacles.length; i++) {
    if( world.obstacles[i].id === id ){
      extra = world.obstacles[i]
      index = i
      break;
    }
  }

  if( extra ){
    world.obstacles.splice(index,1)
    world.bodies.splice(world.bodies.indexOf(extra),1)
    world.remove.push(extra)

    // send it as reliable if host
    if( world.host ){
      buffer.push('od', world.frame)
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
  world.renderer.triggerEvent("updateScore");
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

  // Don't use alive as score for now
  // just keep track on the longest game...
  // world.players.a.score += world.alive;
  // world.players.b.score += world.alive;
  world.maxAlive = Math.max(world.alive,world.maxAlive);

  world.alive = 0;

  // send it as reliable if host
  if( world.host ){
    buffer.push('sr', world.frame)
    buffer.push.apply(buffer,arguments)
    buffer.push(EOP)
  }
}

exports.scoreA = function(x){
  debug('score A',x)
  world.players.a.score++;
  world.players.a.hits.push(+x)
  world.renderer.triggerEvent("hit", {player: "a"});

  // send it as reliable if host
  if( world.host ){
    buffer.push('sa', world.frame)
    buffer.push.apply(buffer,arguments)
    buffer.push(EOP)
  }
}

exports.scoreB = function(x){
  debug('score B',x)
  world.players.b.score++;
  world.players.b.hits.push(+x)
  world.renderer.triggerEvent("hit", {player: "b"});

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
  if( !world.paused ){
    world.paused = true;
    buffer.push('gp', world.frame,EOP)
  }
}

exports.gameResume = function(){
  debug('game resume')
  if( world.paused ){
    world.paused = false;
    buffer.push('gr', world.frame,EOP)
  }
}

exports.gameOver = function(){
  debug('game over')
  if( !world.over ){
    world.over = true;
    buffer.push('go', world.frame,EOP)
  }
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
      var action = {
        args: [type].concat(opts), // TODO opt: creates arrays
        frame: frame
      }
      withFrame.push(action);

    } else {
      noFrame.push([type].concat(opts)) // TODO opt: creates arrays
    }

    parsed++
  })

  debug('parsed %s messages (%s framed, %s unframed)',parsed,withFrame.length, noFrame.length)


  if( withFrame.length ){

    // 0. store current frame
    var currentFrame = world.frame;

    // sort by frame number
    withFrame.sort(function(a,b){return a.frame - b.frame})
    var lastFrame = -1;
    for(var i=0; i<withFrame.length;){
      var action = withFrame[i];

      if( action.frame < lastFrame )
        console.error('frames were not sorted correctly!');

      // 1. rewind
      this.physics.goto(action.frame,world)

      // 2. apply all actions with the same frame
      var frame = action.frame;
      while( action && action.frame === frame ){
        create.apply(null,action.args);
        action = withFrame[++i];
      }

      // 3. just save the frame for sanity checks
      lastFrame = frame;
    }
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
exports.pa = exports.puckSync;
exports.pp = exports.puckPush;
exports.ps = exports.puckSpeed;
exports.pc = exports.puckCreate;
exports.ph = exports.paddleHit;
exports.oc = exports.obstacleCreate;
exports.od = exports.obstacleDestroy;
exports.ec = exports.extraCreate;
exports.ed = exports.extraDestroy;
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

