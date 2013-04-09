var debug = require('debug')('actions:game')
  , actions = require('../actions')
  , see = require('../support/see')
  , dmaf = require('../dmaf.min');

exports.gameToggleDeathball = function(world, active){
  active && dmaf.tell( "deathball_activate");
  actions.emit('renderer','toggleDeathball',{active:active})
}

exports.gameDeathballOver = function(world,puckIndex){
  var playerID = world.lastHitPucks[puckIndex];
  dmaf.tell( "deathball_over");
  actions.roundOver(world,playerID === 'a' ? 0 : 1);
}

exports.gameToggleFog = function(world, active){
  actions.emit('renderer','toggleFog',{active:active})

  if( !active ){
    dmaf.tell( "fog_over");

    // TODO need access to `extra`
    // actions.emit('removeExtra',id,extra);
  }
}

exports.roundOver = function(world, hitPlayerIndex, hitPuckPosition){
  debug('%s round over',world.name)

  var player = hitPlayerIndex === 0
              ? world.players.a
              : world.players.b;

  if( !world.multiplayer || (world.name == 'sync' || player === world.me ) ){

    // mark who was last hit
    player.hit = hitPuckPosition || .5;
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
