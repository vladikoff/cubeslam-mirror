var debug = require('debug')('renderer:3d:animals')
  , settings = require('../settings')
  , Bear = require('./animals/bear')
  , Rabbit = require('./animals/rabbit')
  , Bird = require('./animals/bird1')
  , Moose = require('./animals/moose')
  , Materials = require('./materials');

module.exports = Animals;

// Effects
//   #reset
//   #update(world)

function Animals(renderer, env ){

  this.renderer = renderer;
  this.env = env;
  this.isInitiated = false;
  this.isActive = false;
  this.animals = [];

  if( settings.data.quality == settings.QUALITY_HIGH ) {
    this.enable();
  }

  settings.on("qualityChanged", function(){
    
    if( settings.data.quality == settings.QUALITY_HIGH ) {
      this.enable();
    }
    else if( settings.data.quality == settings.QUALITY_LOW || settings.data.quality == settings.QUALITY_MOBILE ){
      this.disable();
    }

  }.bind(this))

}

Animals.prototype = {

  init: function(){

    if( this.isInitiated ) return;

    this.isInitiated = true;

    this.bear = new Bear(this.env.terrain);
    this.bear.mesh.position.y+=7;
    this.animals.push(this.bear);
    
    this.bear2 = new Bear(this.env.terrain);
    this.bear2.mesh.position.z-=90;
    this.bear2.mesh.position.y+=7;
    this.bear2.mesh.scale.set(2,2,2)
    this.bear2.mesh.rotation.y += -0.2;
    this.animals.push(this.bear2);

    this.bear3 = new Bear(this.env.terrain);
    this.bear3.mesh.position.z+=140;
    this.bear3.mesh.position.y+=7;
    this.bear3.mesh.scale.set(2.1,2.1,2.1)
    this.bear3.mesh.rotation.y += 0.3;
    this.animals.push(this.bear3);

    this.rabbit = new Rabbit(this.env.terrain,0.04, [
      {x:926,    z: 69},
      {x:1039.2, z:61.8},
      {x:1201.2, z:-300},
      {x:1650,   z:40},
      {x:1500,   z:480},
      {x:1140,   z:700},
      {x:940,    z:480},
      {x:926,  z:39}
    ],[16, 17, 25, 36, 31, 25, 24, 22, 19, 18, 15, 19, 32, 43, 54, 63, 59, 52, 46, 42, 30, 19, 8, 8]);
    this.animals.push(this.rabbit);

    this.moose = new Moose(this.env.terrain);
    this.animals.push(this.moose);
    //this.pickingBird = new PickingBird(env.terrain);

    this.introRabbit = new Rabbit( this.env.terrain , 0.02, [
      {x:4700, z:-100},
      {x:4100, z:0},
      {x:2400, z:1000},
      {x:5000, z:200},
      {x:4700, z:-100}
    ],[25, 15, 0, -11, -29, -53, -75, -101, -112, -131, -152, -167, -165, -155, -146, -138, -116, -99, -82, -77, -73, -49, -28, -23, -40, -84, -114, -118, -115, -114, -113, -118, -127, -112, -89, -68, -48, -26, -4, 19, 37, 45, 52, 53, 53, 52, 48, 35, 27])
    this.introRabbit.overrideState = "jump";
    this.animals.push(this.introRabbit);

    this.bird = new Bird(this.env.terrain,[
      {x:5000, y:1850, z:2000},
      {x:-4000, y:1850, z:2200}
       ])
    this.animals.push(this.bird);

    this.bird2 = new Bird(this.env.terrain,[
      {x:4800, y:1250, z:3200},
      {x:-4000, y:1250, z:2200}
       ])
    this.animals.push(this.bird2);

    this.bird3 = new Bird(this.env.terrain,[
      {x:5200, y:1550, z:1800},
      {x:-4000, y:1550, z:1800}
       ])
    this.animals.push(this.bird3);

    //stop running pal
    setTimeout(function(){this.introRabbit.overrideState = ""}.bind(this),6000);

    this.lastTime = 0;
  },

  enable: function(){
    this.isActive = true;

    if(!this.isInitiated) this.init();

    for (var i = this.animals.length - 1; i >= 0; i--) {
      this.animals[i].mesh.visible = true;
      if(this.animals[i].shadowMesh) this.animals[i].shadowMesh.visible = true;
    };
  },

  disable: function(){
    this.isActive = false;
    
    for (var i = this.animals.length - 1; i >= 0; i--) {
      this.animals[i].mesh.visible = false;
      if(this.animals[i].shadowMesh) this.animals[i].shadowMesh.visible = false;
    };

  },

  reset: function(){
    debug('reset')

  },

  triggerEvent: function( id, paramObj ) {

    if( !this.isActive ) return;

    if( id == "bear_win") {
      var index = Math.floor(Math.random()*2);
      if( index == 0) this.bear.win();
      else if( index == 1) {
        this.bear2.win();
        this.bear3.win();
      }

    }
    else if( id == "hunt_birds" ) {
      if( this.bird ) {
        this.bird.destroy();
        this.bird = null;
        this.bird2.destroy();
        this.bird2 = null;
        this.bird3.destroy();
        this.bird3 = null;
      }
    }
  },

  update: function(world,alpha){

    if( !this.isActive ) return;

    var delta = Date.now()-this.lastTime;
    this.lastTime = Date.now();

   
    this.bear.update(world,delta);
    this.bear2.update(world,delta);
    this.bear3.update(world,delta);

    this.rabbit.update(delta);

    if(  this.bird ) {
      this.bird.update(delta);
      this.bird2.update(delta);
      this.bird3.update(delta);
    }

    this.introRabbit.update(delta);
    this.moose.update(delta);
  },

  updateBearLookAt: function( z ) {

    if( !this.isActive ) return;
    
    this.bear.target.z = z;
    this.bear2.target.z = z+100;
    this.bear3.target.z = z-100;
    
  }


}


