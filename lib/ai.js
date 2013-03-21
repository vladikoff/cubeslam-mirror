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
  this.active = false;
  this.noiseAmount = 0;
  this.guiInit = false;
  this.time = 0;
  this.target = null;
  //stores logic
  this.brain = {};

  this.defaults = {
    maxSpeed:20,
    reaction:0.9,
    viewRange:0.6,
    confusion:0
  }

  this.resetBrain();
}

AI.prototype = {

  resetBrain: function(){

    this.time = 0;
    this.brain = {};
    for( var key in this.defaults ) {
      this.brain[key] = this.defaults[key];
    }
  },

  updateBrain: function( data ) {

    this.resetBrain();

    for( var key in data ) {

      if( this.brain.hasOwnProperty(key) ){
        this.brain[key] = data[key];
      }
    }

    if( !this.guiInit &&  settings.gui) {

      this.guiInit = true;

      var f = settings.gui.addFolder("AI")

      for( var key in this.defaults ) {
        if( key == "maxSpeed" )
          f.add(this.brain,key).min(0).max(20).step(0.1).listen();
        else f.add(this.brain,key).min(0).max(1).step(0.1).listen();
      } 
  
    }

  },

  start: function(){
    this.active = true;
    this.noiseAmount = 0;
    TweenMax.to(this,4,{noiseAmount:1,ease:Sine.easeIn})
  },

  stop: function(){
    this.active = false;
    this.time = 0;
  },

  setTarget: function(target){
    this.target = target;
  },

  update: function(world){
    // skip if target doesn't exist (yet)
    if( !this.target || !world.bodies.has(this.target) || !this.active ){
      return false;
    }

    // find closest puck
    var closest = null
      , minDist = settings.data.arenaHeight*this.brain.viewRange
      , target = world.bodies.get(this.target)
      , current = target.current
      , paddleWidth = (target.aabb[1]-target.aabb[3])*0.5;

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

    this.time += 0.1;

    var near = Math.abs(targetY/settings.data.arenaHeight);

    targetX += this.brain.confusion*(Math.sin(this.time*0.5)*Math.sin(this.time*0.2))*400*this.noiseAmount;

    if( closest && closest.velocity[1] < 0 )  current[0] += Math.max(-this.brain.maxSpeed, Math.min(this.brain.maxSpeed,( targetX - current[0])))*this.brain.reaction;
    else current[0] += ( targetX - current[0])*0.01;

    if( current[0] > settings.data.arenaWidth - paddleWidth) current[0] = settings.data.arenaWidth - paddleWidth;
    else if( current[0] < paddleWidth) current[0] = paddleWidth;

    //target.previous[0] = current[0] // don't generate a velocity

    // ai has moved, let them know
    return true;
  }

}