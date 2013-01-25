var debug = require('debug')('actions:game')

exports.gamePause = function(world){
  debug('pause')
  if( !world.paused ){
    world.paused = true;
  }
}

exports.gameResume = function(world){
  debug('resume')
  if( world.paused ){
    world.paused = false;
  }
}

exports.gameOver = function(world){
  debug('over')
  if( !world.over ){
    world.over = true;
  }
}

exports.gotoLevel = function(world, i){
  debug('level',i)
  // TODO
}