var debug = require('debug')('actions:game')
  , World = require('../world')
  , actions = require('./');

exports.gameStart = function(world){
  debug('%s start',world.name)
  actions.emit('start',world);
}

exports.gamePlay = function(world){
  debug('%s play',world.name)
  actions.emit('play',world);
}

exports.gamePause = function(world){
  debug('%s pause',world.name)
  actions.emit('pause',world);
}

exports.gameResume = function(world){
  debug('%s resume',world.name)
  actions.emit('resume',world);
}

exports.roundOver = function(world){
  debug('%s round over',world.name)
  actions.emit('round over',world);
}
