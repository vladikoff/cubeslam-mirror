var debug = require('debug')('actions:game')
  , World = require('../world')
  , see = require('../support/see');

exports.gamePause = function(world){
  debug('%s pause',world.name)
  world.setState(World.PAUSED);
}

exports.gameResume = function(world){
  debug('%s resume',world.name)
  world.setState(World.PLAYING);
}

exports.gameOver = function(world){
  debug('%s over',world.name)
  // world.setState(World.GAME_OVER);
  see('/game/next');
}
