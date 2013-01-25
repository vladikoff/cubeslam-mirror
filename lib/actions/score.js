var debug = require('debug')('actions:score')

exports.scoreAlive = function(world){
  debug('score alive',world.alive)
  world.alive++;
  this.emit('renderer','updateScore')
}

exports.scoreReset = function(world){
  debug('score reset',world.alive)
  world.maxAlive = Math.max(world.alive,world.maxAlive);
  world.alive = 0;
}
