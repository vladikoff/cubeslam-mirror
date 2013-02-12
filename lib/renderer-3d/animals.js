var debug = require('debug')('renderer:3d:animals')
  , settings = require('../settings')
  , Bear = require('./animals/bear')
  , Rabbit = require('./animals/rabbit')
  , Bird = require('./animals/bird1')
  //, PickingBird = require('./animals/bird4')
  , Moose = require('./animals/moose')
  , Materials = require('./materials');

module.exports = Animals;

// Effects
//   #reset
//   #update(world)

function Animals(renderer, env ){

  this.env = env;

  this.bear = new Bear(env.terrain);
  this.rabbit = new Rabbit(env.terrain,0.04, [
    {x:926,    z: 39}, 
    {x:1039.2, z:31.8}, 
    {x:1201.2, z:-150}, 
    {x:1560,   z:240}, 
    {x:1500,   z:480},
    {x:1140,   z:600},
    {x:940,    z:480},
    {x:926,  z:39}
  ]);
  this.moose = new Moose(env.terrain);
  
  //this.pickingBird = new PickingBird(env.terrain);

  this.introRabbit = new Rabbit( env.terrain , 0.02, [
    {x:4700, z:-100}, 
    {x:4100, z:0}, 
    {x:2400, z:1000}, 
    {x:5000, z:200},
    {x:4700, z:-100}
  ])

  this.bird = new Bird(renderer.cameraController.camera,0.02,[{x:800, z:-606},{x:-800, z:-606} ])
  
  //stop running pal
  setTimeout(function(){this.introRabbit.overrideState = ""}.bind(this),8000);

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
    this.bird.update(delta);
    this.introRabbit.update(delta);
    //this.pickingBird.update(delta);
    this.moose.update(delta);
  }


}


