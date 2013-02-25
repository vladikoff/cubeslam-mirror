var debug = require('debug')('actions:player')
  , settings = require('../settings')
  , shapes = require('../sim/shapes')
  , BodyFlags = require('../sim/body-flags')
  , actions = require('../actions')
  , see = require('../support/see')

exports.playerHit = function(world,player,puck){
  debug('%s hit',world.name ,player,puck.index)

  var aw = settings.data.arenaWidth;

  // update the score for the opponent
  var other = player === world.players.a
              ? world.players.b
              : world.players.a;
  other.score += 1;

  if( player == world.opponent ) {
    dmaf.tell('opponent_score_hit');
    dmaf.tell('user_won_round')
    this.emit('renderer','hitOpponent',{point: puck.current[0]/aw})
  }
  else if( player == world.me ) {
    dmaf.tell('user_score_hit');
    dmaf.tell('user_lost_round');
    this.emit('renderer','hitMe',{point: puck.current[0]/aw*0.5 + 0.5})
  }

  this.emit('round over',world)
}