var settings = require('../settings')
  , world = require('../world')
  , debug = require('debug')('renderer:3d:camera');

module.exports = CameraController;

// Camera
//   - puckTrails[]
//   #update(world)

function CameraController(env){
  debug('new')

  this.env = env
  
  var camera = new THREE.PerspectiveCamera( 50, 1, 10, 20000 );
  this.camera = camera;


  this.target = new THREE.Vector3(0,0,0);
  this.time = Date.now();
  this.initAngle = null;
  this.activeUser = null;
}

CameraController.prototype = {

  reset: function(){
    debug('reset')
   
  },

  update: function(world,alpha){  

  }

  setActiveUser : function( user) {
    this.activeUser = user;
  }

  setState : function( state ) {

    if( state == "lobby" ) {

      //time used for circular motion to start from correct angle
      this.time = Date.now();
      this.initAngle = Math.atan2(this.camera.position.z, this.camera.position.x) - Math.PI*.25;

      this.cameraUpdateFunc = function(){

        var localTime = this.time-Date.now();
        var pos = this.camera.position;
        var angle = this.initAngle - localTime*0.0001

        pos.x += (Math.sin(angle)*3000-pos.x)/14;
        pos.y += (2000-pos.y)/14;
        pos.z += (Math.cos(angle)*3000-pos.z)/14;

        pos = this.cameraController.target;
        pos.x += (this.env.center.x-pos.x)/24;
        pos.y += (this.env.center.y-pos.y)/24;
        pos.z += (this.env.center.z-pos.z)/24;

        this.camera.lookAt(this.target);

      }.bind(this)
    }
    else if( state == "webcamActivation"){

      this.cameraUpdateFunc = function(){
        var dist = this.moveCamera(this.activeUser.cameraPaddleSetupPosition);
        /*if( dist < 10 ) {
          if (typeof callback === 'function') {
            callback();
            callback = null;
          }
        }*/

      }.bind(this);

    }
    else if( state == "waitingForGameStart"){

      this.cameraUpdateFunc = function(){
        this.moveCamera(this.activeUser.cameraWaitingPosition);
      }.bind(this);

    }
    else if( state == "play" ) {

      this.cameraUpdateFunc = function( world ){
        this.moveCamera(this.activeUser.cameraPlayPosition);

        // base camera position on users movement
        if( this.activeUser )
          this.activeUser.cameraOffset.x = 20*(this.activeUser.paddle.position.x/(world.bounds[1]-world.bounds[3]));

      }.bind(this);

    }
}



