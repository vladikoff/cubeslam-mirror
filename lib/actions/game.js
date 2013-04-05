var debug = require('debug')('actions:game')
  , actions = require('../actions')
  , see = require('../support/see');

exports.roundOver = function(world, hitPlayerIndex, hitPuckPosition){
  debug('%s round over',world.name)

  var player = hitPlayerIndex === 0
              ? world.players.a
              : world.players.b;

  if( !world.multiplayer || (world.name == 'sync' || player === world.me ) ){

    // mark who was last hit
    player.hit = hitPuckPosition;
    console.log('\n\n\nHIT!!! %s\n\n\n',world.name,hitPlayerIndex,hitPuckPosition)

    // show a distortion effect
    // TODO somehow get a hold of the position of the killing puck
    if( world.opponent.hit != -1 ){
      console.log('hit opponent?')
      actions.emit('renderer','hitOpponent',{point: player.hit})
      dmaf.tell('opponent_score_hit')

    } else if( world.me.hit != -1 ){
      console.log('hit me?')
      actions.emit('renderer','hitMe')
      dmaf.tell('user_score_hit')
    }

    see('/game/next')
  }
}
