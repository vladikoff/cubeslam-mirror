var debug = {
      collide: require('debug')('collisions:collide'),
      bound: require('debug')('collisions:bound')
    }
  , actions = require('./actions')
  , settings = require('./settings')
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
  // debug.collide('in "%s" at frame %s',world.name,world.frame)
  world.collisions++
  // delegate based on `a.id`
  switch(a.id){
    case 'puck': return Collide.puck(world,a,b,c);
    case 'bullet': return Collide.bullet(world,a,b,c);
    case 'shield': return Collide.shield(world,a,b,c);
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
  // debug.bound('in "%s" at frame %s',world.name,world.frame)
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
    actions.hitPaddle(world,p,q)
    actions.puckBounced(world,p)

  // hit an extra.
  } else if( world.extras.has(q.index) ){
    actions.hitExtra(world,p,q)

  // hit an bullet (reflect)
  // TODO should this be done here or is this automatic through flags?
  } else if( world.bullets.has(q.index) ){
    vec.copy(q.current,p.current);
    vec.copy(q.previous,p.previous);
    vec.make(q.velocity,p.velocity);

  }
}


Collide.bullet = function(world,p,b){
  debug.collide('bullet',p.index,b.index)
  actions.destroyBullet(world,p);
}

Collide.shield = function(world,s,p,c){
 debug.collide('shield',p.index,s.index,c)
 actions.hitShield(world,s,p)
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
  }

  actions.puckBounced(world,p)

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

