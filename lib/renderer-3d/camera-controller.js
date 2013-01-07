var settings = require('../settings')
  , world = require('../world')
  , debug = require('debug')('renderer:3d:camera')
  , $ = require('jquery');

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
  this.cameraUpdateFunc = function(){}
  this.initAngle = null;
  this.activeUser = null;
  
  var controls = new THREE.FirstPersonControls( this.camera );
  //camera control properties
  controls.movementSpeed = 100;
  controls.activeLook = true;
  controls.domElement = document.getElementById('game');
  this.controls = controls

  this.gameOverData = [
    { 
      start: { origin: new THREE.Vector3(0,200,0), target: new THREE.Vector3(0,200,1000) },
      end: { origin: new THREE.Vector3(-1000,1200,0), target: new THREE.Vector3(10,400,-1000), time:3 }
    },
    { 
      start: { origin: new THREE.Vector3(1000,200,0), target: new THREE.Vector3(0,200,1000) },
      end: { origin: new THREE.Vector3(1000,1200,0), target: new THREE.Vector3(0,200,1000), time:3 }
    },
    {
      start: { origin: new THREE.Vector3(1000,200,1000), target: new THREE.Vector3(0,200,-1000), time:3 },
    }
  ]

  this.activeList = null;

  //temp function
  $(document).bind('keypress', function(e) {
    //C
    if(e.keyCode==67){
      console.log("Camera position",camera.position)
      console.log("Camera rotation",camera.rotation)
      console.log("Camera target",camera.target)
    }
  });

}

CameraController.prototype = {

  reset: function(){
    debug('reset')
   
  },

  update: function(world,alpha){  
     if( settings.data.overrideCamera == "top") {
        this.camera.position.set(300,3000,0);
        this.camera.lookAt( new THREE.Vector3(300,0,0));
        this.camera.rotation.z = Math.PI*.5
      } else {
        if( this.cameraUpdateFunc && !settings.data.fpsCamera )
          this.cameraUpdateFunc(world);
      }

      if( settings.data.fpsCamera ) this.controls.update(0.1);
  },

  setActiveUser : function( user) {
    this.activeUser = user;
  },

  setState : function( state ) {

    TweenMax.killDelayedCallsTo(this.nextPosition); 

    TweenMax.killTweensOf(this.camera.position)
    TweenMax.killTweensOf(this.target)

    if( state == "lobby" ) {

      /*//time used for circular motion to start from correct angle
      this.time = Date.now();
      this.initAngle = Math.atan2(this.camera.position.z, this.camera.position.x) - Math.PI*.25;

      this.cameraUpdateFunc = function(){

        var localTime = this.time-Date.now();
        var pos = this.camera.position;
        var angle = this.initAngle - localTime*0.0001

        pos.x += (Math.sin(angle)*3000-pos.x)/14;
        pos.y += (2000-pos.y)/14;
        pos.z += (Math.cos(angle)*3000-pos.z)/14;

        pos = this.target;
        pos.x += (this.env.center.x-pos.x)/24;
        pos.y += (this.env.center.y-pos.y)/24;
        pos.z += (this.env.center.z-pos.z)/24;

        this.camera.lookAt(this.target);

      }.bind(this)*/

      this.activeList = this.gameOverData;
      this.currentCameraIndex = -1;

      this.nextPosition();

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

      this.cameraUpdateFunc = function(){
        this.moveCamera(this.activeUser.cameraPlayPosition);

        // base camera position on users movement
        if( this.activeUser )
          this.activeUser.cameraOffset.x = 20*(this.activeUser.paddle.position.x/(world.bounds[1]-world.bounds[3]));

      }.bind(this);

    }
  },

  nextPosition : function() {

    this.currentCameraIndex++

    if(this.currentCameraIndex>this.activeList.length-1) this.currentCameraIndex = 0;

    var obj = this.activeList[this.currentCameraIndex];
    this.camera.position = obj.start.origin.clone();
    this.target = obj.start.target.clone();
    this.camera.lookAt(this.target);

    if( obj.end ) {
      //tween it
      var toOrigin = obj.end.origin.clone();
      TweenMax.to(this.camera.position, obj.end.time, {
        x: toOrigin.x,y: toOrigin.y,z: toOrigin.z,
        ease:Sine.easeInOut,
        onComplete: function(){
          this.nextPosition();
        }.bind(this)
      });

      var toTarget = obj.end.target.clone();
      TweenMax.to(this.target, obj.end.time, {
        x: toTarget.x,y: toTarget.y,z: toTarget.z,
        ease:Sine.easeInOut,
        onUpdate:function(){
          this.camera.lookAt(this.target);
        }.bind(this)
        
      });
    }
    else {
      TweenMax.delayedCall( obj.start.time, this.nextPosition.bind(this) )
    }



  },

  moveCamera : function(pointData){

    var originCurrent = this.camera.position;

    if( this.active ) {
      originCurrent.x += this.activeUser.cameraOffset.x;
      originCurrent.z += this.activeUser.cameraOffset.z;

      this.activeUser.cameraOffset.z *= 0.88;
    }

    originCurrent.x += (pointData.origin.x+this.activeUser.cameraOffset.x-originCurrent.x)/4;
    originCurrent.y += (pointData.origin.y-originCurrent.y)/14;
    originCurrent.z += (pointData.origin.z-originCurrent.z)/14;

    var targetCurrent = this.target;
    targetCurrent.x += ((pointData.target.x+this.activeUser.cameraOffset.x*2)-targetCurrent.x)/4;
    targetCurrent.y += (pointData.target.y-targetCurrent.y)/24;
    targetCurrent.z += (pointData.target.z-targetCurrent.z)/24;

    this.camera.lookAt(targetCurrent);

    return originCurrent.distanceTo(pointData.origin);
  }

}


