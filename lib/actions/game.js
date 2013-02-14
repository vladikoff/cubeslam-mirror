var debug = require('debug')('actions:game')

exports.gamePause = function(world){
  debug('%s pause',world.name)
  if( !world.paused ){
    world.paused = true;
  }
}

exports.gameResume = function(world){
  debug('%s resume',world.name)
  if( world.paused ){
    world.paused = false;
  }
}

exports.gameOver = function(world){
  debug('%s over',world.name)
  if( !world.over ){
    world.over = true;
  }
}

exports.gotoLevel = function(world, i){
  debug('%s level',world.name ,i)
  // TODO
}