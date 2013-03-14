var debug = require('debug')('ai')
  , geom = require('geom')
  , settings = require('./settings')
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
  this.shooting = false;
  this.offsetShootX = 0;
  //stores logic
  this.brain = {};
  this.aimDirection = 1;

  this.defaults = {
    maxSpeed:10,
    reaction:0.8,
    viewRange:0.6
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
      , minDist = settings.data.arenaHeight*this.brain.viewRange
      , target = world.bodies.get(this.target)
      , current = target.current;

    if( !current ) return;

    for(var i=0; i < world.pucks.length; i++){
      var puck = world.pucks.values[i]
        , dist = vec.distSq(current,puck.current)

      minDist *= minDist

      if( dist < minDist ){
        minDist = dist;
        closest = puck;
      }
    }

    // no puck found
    var targetX = settings.data.arenaWidth*.5;
    var targetY = settings.data.arenaHeight;
    if( closest ) {
      targetX = closest.current[0];
      targetY = closest.current[1];
    }
    var near = Math.abs(targetY/settings.data.arenaHeight);

    if( near < 0.2 && !this.shooting && closest.velocity[1] < 0 ) {
      this.aimDirection = (Math.random()>0.5)?1:-1
      this.shooting = true;
      TweenMax.to(this,0.3,{offsetShootX:10*this.aimDirection,onComplete:function(){
        TweenMax.to(this,0.4,{offsetShootX:0,onComplete:function(){
          this.shooting = false;
          }.bind(this)});
      }.bind(this)})
    }

    var offsetX = 140-near*140;

    // update position

    if( !this.shooting ) {
      targetX += offsetX;
      this.time += 0.1;
      targetX += ImprovedNoise.noise(0,this.time*0.5,0)*targetX/settings.data.arenaHeight*100

    }
    else {
      target.velocity[0] = this.offsetShootX;
      targetX += this.offsetShootX*10;
    }


    current[0] += Math.max(-this.brain.maxSpeed, Math.min(this.brain.maxSpeed, ( targetX - current[0] )*this.brain.reaction));

    target.previous[0] = current[0] // don't generate a velocity

    // ai has moved, let them know
    return true;
  }

}