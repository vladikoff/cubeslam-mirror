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

function AI(target){
  debug('created')

  this.target = target;
  this.maxSpeed = 5;
}

AI.prototype = {

  update: function(world){
    // find closest puck
    var closest = null
      , minDist = Infinity
      , current = this.target.current;
    for(var i=0; i < world.pucks.length; i++){
      var puck = world.pucks.values[i]
        , dist = vec.distSq(current,puck.current)
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
    current[0] += Math.max(-this.maxSpeed, Math.min(this.maxSpeed, (closest.current[0] - current[0])/10));
    this.target.previous[0] = current[0] // don't generate a velocity

    // ai has moved, let them know
    return true;
  }

}