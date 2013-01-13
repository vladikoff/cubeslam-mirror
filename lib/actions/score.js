var debug = require('debug')('actions:score')

exports.scoreAlive = function(world){
  world.alive++;
  // world.renderer.triggerEvent("updateScore");
  debug('score alive',world.alive)
}


exports.scoreReset = function(world){
  debug('score reset',world.alive)

  // Don't use alive as score for now
  // just keep track on the longest game...
  // world.players.a.score += world.alive;
  // world.players.b.score += world.alive;
  world.maxAlive = Math.max(world.alive,world.maxAlive);

  world.alive = 0;
}


exports.score = function(world,who,score){
  debug('score %s',who,score)
  if( who != 'a' && who != 'b' )
    return console.error('invalid scorer',arguments)
  world.players[who].score = score;
}
