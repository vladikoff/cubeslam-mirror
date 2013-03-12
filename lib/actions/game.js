var debug = require('debug')('actions:game')
  , World = require('../world')
  , actions = require('./');

exports.gamePause = function(world){
  debug('%s pause',world.name)
  world.setState(World.PAUSED);
  actions.emit('pause',world);
}

exports.gameResume = function(world){
  debug('%s resume',world.name)
  world.setState(World.PLAYING);
  actions.emit('resume',world);
}

exports.gameOver = function(world){
  debug('%s game over',world.name)
  actions.emit('game over',world);
  // world.setState(World.GAME_OVER);
  // see('/game/next');
}

exports.roundOver = function(world){
  debug('%s round over',world.name)
  actions.emit('round over',world);
  // world.setState(World.GAME_OVER);
  // see('/game/next');
}
