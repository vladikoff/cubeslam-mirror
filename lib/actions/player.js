var debug = require('debug')('actions:player')
  , settings = require('../settings')
  , shapes = require('../geom-sim/shapes')
  , BodyFlags = require('../geom-sim/body-flags')
  , actions = require('../actions')
//  , audio = require('../audio')
  , see = require('../support/see')

exports.playerHit = function(world,player,puck){
  debug('%s hit',world.name ,player,puck.index)

  // update the score for the opponent
  var other = player === world.players.a
              ? world.players.b
              : world.players.a;
  other.score += 1;

  // position audio
  // 0 = near, -10 = far away
  if( settings.data.sounds ){
    var aw = settings.data.arenaWidth
      , ah = settings.data.arenaHeight
      , ax = puck.current[0]/aw-.5*-0.8
      , ay = (ah-puck.current[1]/ah)*-10
    //audio.play3D("miss", new THREE.Vector3(ax,0,ay));
  }

  if( player == world.opponent )
    this.emit('renderer','hitOpponent',{point: puck.current[0]/aw})
  else if( player == world.me )
    this.emit('renderer','hitMe',{point: puck.current[0]/aw*0.5 + 0.5})

  this.emit('round over',world)
  // see('/game/next')
}