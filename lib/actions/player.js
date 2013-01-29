var debug = require('debug')('actions:player')
  , settings = require('../settings')
  , shapes = require('../geom-sim/shapes')
  , BodyFlags = require('../geom-sim/body-flags')
  , actions = require('../actions')
  , audio = require('../audio')
  , see = require('../support/see');

exports.playerHit = function(world,player,puck){
  debug('hit',player,puck.index)

  this.scoreReset(world)

  // update the score
  player.score += 1;

  // update the hits
  player.hits += 1;

  // TODO mark round as over

  // TODO see('/game/next') (will pause game, update progress & distort screen)
  //      > see('/game/start') (shows level 1, round 2)

  // add ghosting effect
  // TODO never use intervals, count frames!
  // BodyFlags.add(p,BodyFlags.GHOST);
  // setTimeout(function(){
  //   BodyFlags.del(p,BodyFlags.GHOST); // turn off
  // },1000)
  // TODO should we use activeExtras instead?
  // world.activeExtras.set('ghost', {puck: puck, start: world.frame, end: world.frame+600} );

  console.log("OMG I WAS HIT, I'M A LOOSER!",player,puck)

  // position audio
  // 0 = near, -10 = far away
  if( settings.data.sounds ){
    var aw = settings.data.arenaWidth
      , ah = settings.data.arenaHeight
      , ax = puck.current[0]/aw-.5*-0.8
      , ay = (ah-puck.current[1]/ah)*-10
    audio.play3D("miss", new THREE.Vector3(ax,0,ay));
  }

  world.over = true;

  see('/game/next')
}