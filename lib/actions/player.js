var debug = require('debug')('actions:player')
  , settings = require('../settings')
  , shapes = require('../geom-sim/shapes')
  , BodyFlags = require('../geom-sim/body-flags')
  , actions = require('../actions')
  , audio = require('../audio')
  , see = require('../support/see')

exports.playerHit = function(world,player,puck){
  debug('hit',player,puck.index)

  // update the score for the opponent
  var other = player === world.players.a ? world.players.b : world.players.a;
  other.score += 1;

  // update the hits
  player.hits += 1;

  // position audio
  // 0 = near, -10 = far away
  if( settings.data.sounds ){
    var aw = settings.data.arenaWidth
      , ah = settings.data.arenaHeight
      , ax = puck.current[0]/aw-.5*-0.8
      , ay = (ah-puck.current[1]/ah)*-10
    audio.play3D("miss", new THREE.Vector3(ax,0,ay));
  }

  // TODO mark round, but not game, as over
  // TODO see('/game/next') (will pause game, update progress & distort screen)
  //      > see('/game/start') (shows level 1, round 2)

  see('/game/next')
}