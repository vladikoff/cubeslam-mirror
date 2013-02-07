var debug = require('debug')('renderer:3d:animals')
  , settings = require('../settings')
  , Bear = require('./animals/bear')
  , Rabbit = require('./animals/rabbit')
  , Bird1 = require('./animals/bird1')
  , PickingBird = require('./animals/bird4')
  , Moose = require('./animals/moose')
  , Materials = require('./materials');

module.exports = Animals;

// Effects
//   #reset
//   #update(world)

function Animals(renderer, env ){

  this.env = env;

  this.bear = new Bear(env.terrain);
  this.rabbit = new Rabbit(env.terrain,0.04, [{x:(311+900)*0.6, z:(665-600)*0.6}, {x:(832+900)*0.6, z:(653-600)*0.6}, {x:(1102+900)*0.6, z:(350-600)*0.6}, {x:(1700+900)*0.6, z:(1000-600)*0.6}, {x:(1600+900)*0.6, z:(1400-600)*0.6} ,{x:(1000+900)*0.6, z:(1600-600)*0.6},{x:(500+900)*0.6, z:(1400-600)*0.6},{x:(311+900)*0.6, z:(665-600)*0.6}]);
  this.moose = new Moose(env.terrain);
  
  this.pickingBird = new PickingBird(env.terrain);

  this.introRabbit = new Rabbit( env.terrain , 0.02, [{x:5100, z:0}, {x:5000, z:0}, {x:2400, z:1000}, {x:5000, z:200}])


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

    var puck = world.pucks.values[0]
    if( puck ) {
      var mesh = this.env.pucks.get(puck.index);
       this.bear.target.z = mesh.position.z;
    }


    this.bear.update(world,delta);
    this.rabbit.update(delta);
    this.introRabbit.update(delta);
    this.pickingBird.update(delta);
    this.moose.update(delta);
  }


}


