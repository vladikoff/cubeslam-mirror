var debug = require('debug')('actions:game')

exports.gamePause = function(world){
  debug('game pause')
  if( !world.paused ){
    world.paused = true;
  }
}

exports.gameResume = function(world){
  debug('game resume')
  if( world.paused ){
    world.paused = false;
  }
}

exports.gameOver = function(world){
  debug('game over')
  if( !world.over ){
    world.over = true;
  }
}

exports.gotoLevel = function(world, i){
  debug('goto level',i)
  // TODO
}