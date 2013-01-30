var debug = require('debug')('actions:score')

exports.scoreAlive = function(world){
  throw "should not be in use"
  debug('score alive',world.alive)
  world.alive++;
}

exports.scoreReset = function(world){
  throw "should not be in use"
  debug('score reset',world.alive)
  world.maxAlive = Math.max(world.alive,world.maxAlive);
  world.alive = 0;
}
