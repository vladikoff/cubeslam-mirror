var debug = require('debug')('ai')
  , geom = require('geom')
  , vec = geom.vec

  //move this to support folder
  , ImprovedNoise = require('./renderer-3d/improved-noise');

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

function AI(){
  debug('created')

  this.time = 0;
  this.target = null;

  //stores logic
  this.brain = {};

  this.defaults = {
    maxSpeed:10,
    reaction:0.8
  }

  this.resetBrain();
}

AI.prototype = {

  resetBrain: function(){
    this.brain = {};
    for( key in this.defaults ) {
      this.brain[key] = this.defaults[key];
    }
  },

  updateBrain: function( data ) {

    this.resetBrain();

    for( key in data ) {
      if( this.brain.hasOwnProperty(key) ){
        this.brain[key] = data[key];
        console.log("update: " + data[key])
      }
    }

  },

  setTarget: function(target){
    this.target = target;
  },

  update: function(world){
    // skip if target doesn't exist (yet)
    if( !this.target || !world.bodies.has(this.target) ){
      return false;
    }

    // find closest puck
    var closest = null
      , minDist = Infinity
      , target = world.bodies.get(this.target)
      , current = target.current;

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

    this.time += 0.1;

    // update position
    var targetX = closest.current[0]
    targetX += ImprovedNoise.noise(0,this.time*0.5,0)*100

    current[0] += Math.max(-this.brain.maxSpeed, Math.min(this.brain.maxSpeed, ( targetX - current[0])*this.brain.reaction));
    target.previous[0] = current[0] // don't generate a velocity



    // ai has moved, let them know
    return true;
  }

}