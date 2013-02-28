var debug = require('debug')('actions:player')
  , settings = require('../settings')
  , shapes = require('../sim/shapes')
  , BodyFlags = require('../sim/body-flags')
  , actions = require('../actions')
  , see = require('../support/see')
  , $ = require('jquery');

exports.playerHit = function(world,player,puck){
  debug('%s hit',world.name ,player,puck.index)

  var aw = settings.data.arenaWidth;

  // update the score for the opponent
  var other = player === world.players.a
              ? world.players.b
              : world.players.a;
  other.score += 1;

  world.lastHit = player;

  // TODO we want to check for 'sync' when
  // multiplayer and 'game' in singleplayer
  // to avoid fake hits in multiplayer when
  // the local game disagrees.
  if( world.name != 'sync' ){
    if( player == world.opponent ) {
      this.emit('renderer','hitOpponent',{point: puck.current[0]/aw})
    }
    else if( player == world.me ) {
      this.emit('renderer','hitMe',{point: puck.current[0]/aw*0.5 + 0.5})
    }
  }

  this.emit('round over',world)
}