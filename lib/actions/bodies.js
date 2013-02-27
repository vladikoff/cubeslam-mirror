var debug = require('debug')('actions:bodies')
  , actions = require('./');

/**
 * Destroys a Body based on index.
 *
 * Used in `world.copyBodies()` as it doesn't know
 * which what type of body it will have to delete.
 *
 * @param  {World} world
 * @param  {Number} index
 */
exports.destroy = function(world,index){
  debug('%s destroy',world.name,index)

  if( world.pucks.has(index) ){
    actions.destroyPuck(world,world.pucks.get(index));

  } else if( world.extras.has(index) ){
    actions.destroyExtra(world,world.extras.get(index));

  } else if( world.obstacles.has(index) ){
    actions.destroyObstacle(world,world.obstacles.get(index));

  } else if( world.forces.has(index) ){
    actions.destroyForce(world,world.forces.get(index));

  } else if( world.bullets.has(index) ){
    actions.destroyBullet(world,world.bullets.get(index));

  } else if( world.paddles.has(index) ){
    actions.destroyPaddle(world,world.paddles.get(index));

  } else if( world.shields.has(index) ){
    actions.destroyShield(world,world.shields.get(index));

  } else {
    console.warn('unknown type of body:',index)
  }
}