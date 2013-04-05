var debug = require('debug')('actions:game')
  , settings = require('../settings')
  , actions = require('../actions')
  , see = require('../support/see');

exports.roundOver = function(world, hitPlayerIndex){
  debug('%s round over',world.name)

  var player = hitPlayerIndex === 0
              ? world.players.a
              : world.players.b;

  if( !world.multiplayer || (world.name == 'sync' || player === world.me ) ){

    // mark who was last hit
    player.hit = true; // TODO make this the x value below! (sent over the network...)

    // show a distortion effect
    // TODO somehow get a hold of the position of the killing puck
    var aw = settings.data.arenaWidth;
    if( world.opponent.hit ){
      console.log('hit opponent?')
      var x = 0.5; // puck.current[0]/aw
      actions.emit('renderer','hitOpponent',{point: x})
      dmaf.tell('opponent_score_hit')
    } else if( world.me.hit ){
      console.log('hit me?')
      var x = 0.5; // puck.current[0]/aw*0.5 + 0.5
      actions.emit('renderer','hitMe',{point: x})
      dmaf.tell('user_score_hit')
    }

    see('/game/next')
  }
}
