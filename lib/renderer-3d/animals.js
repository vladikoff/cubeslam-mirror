var settings = require('../settings')

  , Bear = require('./animals/bear')
  , Rabbit = require('./animals/rabbit')
  , Bird1 = require('./animals/bird1')
  , Bird2 = require('./animals/bird2')
  , Moose = require('./animals/moose')
  , debug = require('debug')('renderer:3d:animals')
  , Materials = require('./materials');

module.exports = Animals;

// Effects
//   #reset
//   #update(world)

function Animals(renderer, env ){
  
  this.env = env;
  
  this.bear = new Bear(env.terrain);
  this.rabbit = new Rabbit(env.terrain);
  

  this.lastTime = 0;
}

Animals.prototype = {

  reset: function(){
    debug('reset')

  },

  triggerEvent: function( id, paramObj ) {
    
    if( id == "bear_win") {
      this.bear.win();
    }
  },

  update: function(world,alpha){
     
    var delta = Date.now()-this.lastTime;
    this.lastTime = Date.now(); 

    if( this.env.pucks[0] ) {
      this.bear.target.z = this.env.pucks[0].position.z;
    }

    this.bear.update(world,delta);
    this.rabbit.update(delta);
  }


}


