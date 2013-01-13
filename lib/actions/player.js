var debug = require('debug')('actions:player')
  , settings = require('../settings')
  , audio = require('../audio');

exports.playerHit = function(world,playerId,x,y){
  debug('player hit',playerId)

  // only the host updates scores and modifies the world
  if( world.host ){
    this.scoreReset()

    // update the score
    world.players[playerId].score += 1;

    // update the hits
    world.players[playerId].hits.push(+x)
  }

  // position audio
  // 0 = near, -10 = far away
  if( settings.data.sounds ){
    var aw = settings.data.arenaWidth
      , ah = settings.data.arenaHeight
      , ax = x/settings.data.arenaWidth-.5*-0.8
      , ay = (1-y/settings.data.arenaHeight)*-10
    audio.play3D("miss", new THREE.Vector3(ax,0,ay));
  }
}
