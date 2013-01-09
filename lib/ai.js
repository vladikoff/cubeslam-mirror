var geom = require('geom')
  , vec = geom.vec
  , debug = require('debug')('ai');

/*
 * TODO
 * To make the AI more like a keyboard player I
 * would like to be able to set these settings instead:
 *
 *  - reaction, how late until the AI reacts (in pucks distance from shield)
 *  - ??
 *
 *  - some AIs would want to shoot sometimes
 *  - some AIs would want to aim for extras
 */

module.exports = AI;

function AI(x,y){
  debug('created')

  this.position = vec.make(x,y);
  this.maxSpeed = 5;
}

AI.prototype = {

  update: function(world){
    // find closest puck
    var closest = null;
    var minDist = Infinity;
    for(var i=0; i < world.pucks.values.length; i++){
      var puck = world.pucks.values[i]
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
    this.maxSpeed = world.level.speedAI || this.maxSpeed;
    this.position[0] += Math.max(-this.maxSpeed, Math.min(this.maxSpeed, (closest.current[0] - this.position[0])/10));

    // ai has moved, let them know
    return true;
  }

}