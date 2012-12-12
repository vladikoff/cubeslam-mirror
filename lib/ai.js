var geom = require('geom')
  , vec = geom.vec
  , debug = require('debug')('ai');


module.exports = AI;

function AI(){
  debug('created')

  this.position = vec.make(0.5,0);
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

    // no puck found
    if( !closest ){
      debug('ignoring ai, no puck found')
      return false;
    }

    // update position
    var max = 5;
    this.position[0] += Math.max(-max, Math.min(max, (closest.current[0] - this.position[0])/10));

    // ai has moved, let them know
    return true;
  }

}