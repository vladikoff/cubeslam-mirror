var debug = require('debug')('actions:player')
  , inputs = require('../inputs');

exports.playerHit = function(world,player,puck){
  console.log('%s hit',world.name ,player,puck.index)

  // only send HIT if it was me who was hit in multiplayer
  // otherwise send it everytime. (AI sucks at networking)
  if( (!world.multiplayer || world.name == 'game') && player == world.me ){
    var index = player === world.players.a ? 0 : 1;
    inputs.record(inputs.types.HIT,index)
  }
}