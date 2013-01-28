var debug = require('debug')('actions:player')
  , settings = require('../settings')
  , actions = require('../actions')
  , audio = require('../audio');

exports.playerHit = function(world,player,puck){
  debug('hit',player,puck.index)

  this.scoreReset(world)

  // update the score
  player.score += 1;

  // update the hits
  player.hits += 1;

  // add ghosting effect
  // TODO never use intervals, count frames!
  // BodyFlags.add(p,BodyFlags.GHOST);
  // setTimeout(function(){
  //   BodyFlags.del(p,BodyFlags.GHOST); // turn off
  // },1000)

  // and if there's more than one puck left:
  // remove the colliding one
  if( world.pucks.values.length > 1 )
    actions.puckDestroy(world,puck);

  // position audio
  // 0 = near, -10 = far away
  if( settings.data.sounds ){
    var aw = settings.data.arenaWidth
      , ah = settings.data.arenaHeight
      , ax = puck.current[0]/aw-.5*-0.8
      , ay = (ah-puck.current[1]/ah)*-10
    audio.play3D("miss", new THREE.Vector3(ax,0,ay));
  }
}
