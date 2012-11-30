var geom = require('geom')
  , vec = geom.vec
  , debug = require('debug')('ai');


module.exports = AI;

function AI(){
  debug('created')

  // TODO setting for "skill"?
  this.position = vec.make();
}

AI.prototype = {

  update: function(world){

    // find closest puck
    var closest = null;
    var minDist = Infinity;
    for(var i=0; i < world.pucks.length; i++){
      var puck = world.pucks[i]
        , dist = vec.distSq(this.position,puck.current)
      if( dist < minDist ){
        minDist = dist;
        closest = puck;
      }
    }

    // debug('update',minDist,closest)

    // no puck found
    if( !closest )
      return false;

    // follow puck at an accelerating speed (w. max)
    this.position[0] += (closest.current[0] - this.position[0])/10;

    // ai has moved, let them know
    return true;
  }

}