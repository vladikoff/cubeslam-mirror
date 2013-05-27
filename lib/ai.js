var debug = require('debug')('ai')
  , geom = require('geom')
  , settings = require('./settings')
  , actions = require('./actions')
  , vec = geom.vec
  , ImprovedNoise = require('./support/improved-noise');

module.exports = AI;

function AI( name ){
  debug('created')
  this.name = name;
  this.active = false;
  this.noiseAmount = 0;
  this.guiInit = false;
  this.time = 0;
  this.target = null;
  this.currentConfusionOffsetX = 0;
  //stores logic
  this.brain = {};

  this.defaults = {
    maxSpeed:20,
    reaction:0.9,
    viewRange:0.6,
    confusion:0
  }

  this.resetBrain();

  actions.on('opponentPaddleHit', this.paddleHit.bind(this) )
}

AI.prototype = {

  resetBrain: function(){
    debug('reset brain')

    this.time = 0;
    this.brain = {};
    for( var key in this.defaults ) {
      this.brain[key] = this.defaults[key];
    }
  },

  updateBrain: function( data ) {
    debug('update brain',data)

    this.resetBrain();

    for( var key in data ) {
      if( this.brain.hasOwnProperty(key) ){
        this.brain[key] = data[key];
      }
    }

    if( !this.guiInit && settings.gui && this.name == 'game'){

      this.guiInit = true;

      var f = settings.gui.addFolder('AI')

      for( key in this.defaults ) {
        if( key == 'maxSpeed' ){
          f.add(this.brain,key).min(0).max(20).step(0.1).listen();
        } else {
          f.add(this.brain,key).min(0).max(1).step(0.1).listen();
        }
      }

    }

  },

  paddleHit: function(){
    this.currentConfusionOffsetX = Math.random()*500-250;
  },

  start: function(){
    debug('start')
    this.active = true;
    this.noiseAmount = 0;
  },

  stop: function(){
    debug('stop')
    this.active = false;
    this.time = 0;
  },

  setTarget: function(target){
    debug('set target',target)
    this.target = target;
  },

  update: function(world){
    // skip if target doesn't exist (yet)
    if( !this.active || this.target === null || !world.bodies.has(this.target) ){
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
        , testPos = [puck.current[0],current[1]]
        , dist = vec.distSq(testPos,puck.current)

      minDist *= minDist

      if( dist < minDist ){
        minDist = dist;
        closest = puck;
      }
    }

    // no puck found
    var targetX = settings.data.arenaWidth*0.5;
    if( closest ) {
      targetX = closest.current[0] + this.currentConfusionOffsetX*this.brain.confusion*0.5;
    } else {
      targetX += this.currentConfusionOffsetX*this.brain.confusion;
    }

    if(this.noiseAmount<1){
      this.noiseAmount+= 0.004;
    }

    //offset target with confusion
    targetX += this.currentConfusionOffsetX*this.brain.confusion*0.3*this.noiseAmount;

    this.time += 0.1;

    targetX += Math.sin(this.time*2.2)*40*this.noiseAmount*this.brain.confusion;

    if( closest && closest.velocity[1] < 0 ){
      current[0] += Math.max(-this.brain.maxSpeed, Math.min(this.brain.maxSpeed,( targetX - current[0])))*this.brain.reaction;

    } else {
      current[0] += (targetX - current[0])*0.01*this.noiseAmount*this.brain.reaction;
    }

    if( current[0] > settings.data.arenaWidth - paddleWidth) {
      current[0] = settings.data.arenaWidth - paddleWidth;
    } else if( current[0] < paddleWidth) {
      current[0] = paddleWidth;
    }

    // ai has moved, let them know
    return true;
  }

}