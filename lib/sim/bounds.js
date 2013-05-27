var debug = require('debug')('sim:bounds')
  , actions = require('../actions')
  , settings = require('../settings')
  , BodyFlags = require('./body-flags')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , dmaf = require('../dmaf.min');

/**
 * Will take care of the collision between
 * a body and boundries detected in physics.js.
 *
 * @param  {World} world
 * @param  {Body} a     A body
 * @param  {Object} b   Collision information (ex. {})
 * @return
 */


exports.puck = function(world,p,b){
  debug('puck',p.index)

  var h = (p.aabb[2] - p.aabb[0])*.5;

  // first see if we hit the bounds behind
  // any player?
  var player = null;
  if( p.current[1] <= h ){
    player = world.players.b;
  } else if( p.current[1] >= settings.data.arenaHeight-h  ){
    player = world.players.a;
  }

  // offset b to avoid intersection
  vec.add(p.current, b, p.current)

  // flip velocity by adding it to current
  // (moving the previous ahead)
  if( b[0] ) p.previous[0] = p.current[0] + p.velocity[0]
  if( b[1] ) p.previous[1] = p.current[1] + p.velocity[1]

  // update the velocity
  vec.sub(p.current, p.previous, p.velocity)

  // negate the offset if there is one
  if( p.interpolate.offset ){
    // console.log('negating the interpolation offset')
    if( b[0] ) p.interpolate.offset[0] = -p.interpolate.offset[0];
    if( b[1] ) p.interpolate.offset[1] = -p.interpolate.offset[1];
  }

  // check for player
  if( player && !BodyFlags.has(p,BodyFlags.GHOST) && !settings.data.godMode){
    actions.playerHit(world,player,p);
  } else {
    dmaf.tell('wall_hit');
  }

  actions.puckBounced(world,p)
}


exports.paddle = function(world,p,b){
  debug('paddle',p.index)
  // offset b to avoid intersection
  // reset velocity by settings previous to current
  vec.add(p.current, b, p.current)
  vec.copy(p.current, p.previous)
}


exports.bullet = function(world,p,b){
  debug('bullet',p.index)
  actions.destroyBullet(world,p);
}

