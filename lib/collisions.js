var debug = {
      collide: require('debug')('collisions:collide'),
      bound: require('debug')('collisions:bound')
    }
  , actions = require('./actions')
  , settings = require('./settings')
  , audio = require('./audio')
  , BodyFlags = require('./geom-sim/body-flags')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

exports.oncollision = Collide;
exports.onbounds = Bound;


/**
 * Will take care of the collisions between
 * two bodies detected in physics.js.
 *
 * @param  {World} world
 * @param  {Body} a     A body
 * @param  {Body} b     The body `a` collided with
 * @param  {Object} c   Collision information (ex. {})
 * @return
 */
function Collide(world, a, b, c){
  debug.collide('in "%s" at frame %s',world.name,world.frame)
  world.collisions++
  // delegate based on `a.id`
  switch(a.id){
    case 'puck': return Collide.puck(world,a,b,c);
    case 'bullet': return Collide.bullet(world,a,b,c);
    // ignore the rest...
  }
}


/**
 * Will take care of the collision between
 * a body and boundries detected in physics.js.
 *
 * @param  {World} world
 * @param  {Body} a     A body
 * @param  {Object} b   Collision information (ex. {})
 * @return
 */
function Bound(world, a, b, c){
  debug.bound('in "%s" at frame %s',world.name,world.frame)
  world.collisions++
  // delegate based on `a.id`
  switch(a.id){
    case 'puck': return Bound.puck(world,a,b,c);
    case 'bullet': return Bound.bullet(world,a,b,c);
    case 'paddle': return Bound.paddle(world,a,b,c);
    // ignore the rest...
  }
}


Collide.puck = function(world, p, q, c){
  debug.collide('puck',p.index,BodyFlags.toString(p._flags),' > ',q.index,BodyFlags.toString(q._flags));

  // hit a paddle
  if( world.paddles.has(q.index) ){

    // position audio
    // 0 = near, -10 = far away
    if( settings.data.sounds ){
      var aw = settings.data.arenaWidth
        , ah = settings.data.arenaHeight
        , ax = p.current[0]/settings.data.arenaWidth-.5*-0.8
        , ay = (1-p.current[1]/settings.data.arenaHeight)*-10
      audio.play3D("hit2", new THREE.Vector3(ax,0,ay));
    }

    var player = q.index == world.players.a.paddle ? 'a' : 'b';

    // mark who hit this particular puck last
    // not setting it on the puck to avoid modifying
    // the Body "class"
    world.lastHitPucks[p.index] = player;

    // we've been kept alive!
    actions.scoreAlive(world)

    // add some extra power to each hit
    // level.speed * (1 + world.alive * level.speedup)
    // 10 * (1 + 0 * .1) = 10
    // 10 * (1 + 1 * .1) = 11 // +10% from level base
    // 10 * (1 + 2 * .1) = 12 // +20% from level base
    // 10 * (1 + 5 * .1) = 15 // +50% from level base
    // etc.
    // TODO add puck-specific speed? (that can be "upgraded" using fastball extra)
    var speed = world.level.speed * (1 + world.alive * world.level.speedup);
    actions.puckSpeed(world, p, Math.min(speed, world.level.maxspeed));

    actions.emit('renderer','paddleHit',{player: player, velocity: p.velocity})

  // hit an extra.
  } else if( world.extras.has(q.index) ){

    // remove extra (unlike obstacles, extras are removed)
    actions.extraDestroy(world,q)

    // do whatever it is the extra does
    actions.extraHit(world,p,q)

  // hit an bullet
  } else if( world.bullets.has(q.index) ){

    vec.copy(q.current,p.current);
    vec.copy(q.previous,p.previous);
    vec.make(q.velocity,p.velocity);

  }
}


Collide.bullet = function(world,p,b){
  debug.collide('bullet',p.index)
  actions.destroyBullet(world,p);
}


Bound.puck = function(world,p,b){
  debug.bound('puck',p.index)

  var h = p.aabb[2] - p.aabb[0];

  // first see if we hit the bounds behind
  // any player?
  var player = null;
  if( p.current[1] <= h )
    player = world.players.b;
  else if( p.current[1] >= settings.data.arenaHeight-h  )
    player = world.players.a;

  // offset b to avoid intersection
  vec.add(p.current, b, p.current)

  // flip velocity by adding it to current
  // (moving the previous ahead)
  if( b[0] ) p.previous[0] = p.current[0] + p.velocity[0]
  if( b[1] ) p.previous[1] = p.current[1] + p.velocity[1]

  // check for player
  if( player ){
    actions.playerHit(world,player,p);

    // add ghosting effect
    // temporary hack
    // TODO fix
    BodyFlags.add(p,BodyFlags.GHOST);
    setTimeout(function(){
      BodyFlags.del(p,BodyFlags.GHOST); // turn off
    },1000)

    // and if there's more than one puck left:
    // remove the colliding one
    if( world.pucks.values.length > 1 )
      actions.puckDestroy(world,p);
  }
}


Bound.paddle = function(world,p,b){
  debug.bound('paddle',p.index)
  // offset b to avoid intersection
  // reset velocity by settings previous to current
  vec.add(p.current, b, p.current)
  vec.copy(p.current, p.previous)
}


Bound.bullet = function(world,p,b){
  debug.bound('bullet',p.index)
  actions.destroyBullet(world,p);
}

