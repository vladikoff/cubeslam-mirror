var debug = require('debug')('renderer:3d:camera')
  , settings = require('../settings')
  , $ = require('jquery');

module.exports = CameraController;

// Camera
//   - puckTrails[]
//   #update(world)

function CameraController(env){
  debug('new')

  this.env = env
  this.currentState = null;
  this.isAnimating = false;
  var camera = new THREE.PerspectiveCamera( 50, 1, 10, 20000 );
  this.camera = camera;

  var w = window.innerWidth
    , h = window.innerHeight - $('#footer').height();

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  this.target = new THREE.Vector3(0,0,0);
  this.time = Date.now();
  this.stillCameraTimeoutID = null;
  this.cameraUpdateFunc = function(){}
  this.initAngle = null;
  this.activeUser = null;

  var controls = new THREE.FirstPersonControls( this.camera );
  //camera control properties
  controls.movementSpeed = 200;
  controls.activeLook = true;
  controls.domElement = document.getElementById('game');
  this.controls = controls

  this.aspectCompensationZ = null;
  this.cameraOffset = new THREE.Vector3();

  this.cameraSequence = [
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

  window.addEventListener('resize',this.onWindowResize.bind(this),false);
  this.onWindowResize(null);
}

CameraController.prototype = {

  reset: function(){
    debug('reset')

  },

  onWindowResize : function( evt ){
    var w = window.innerWidth,
        h = window.innerHeight - $('#footer').height();

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.aspectCompensationZ = (2000-w)*0.5//(1-w/1600)*1600;

    if( this.aspectCompensationZ < 0 ) this.aspectCompensationZ = 0;

  },

  update: function(world,alpha){
    this.world = world;
    if( settings.data.overrideCamera == "top") {
      this.camera.position.set(300,3000,0);
      this.camera.lookAt( new THREE.Vector3(300,0,0));
      this.camera.rotation.z = Math.PI*.5
    } else {
      if( this.cameraUpdateFunc && !settings.data.fpsCamera ) {
        this.cameraUpdateFunc(world);
      }
    }

    if( settings.data.fpsCamera ) this.controls.update(0.1);
  },

  hit : function() {
    this.isAnimating = true;
    this.cameraOffset.y = 160
    this.cameraOffset.z = 460
    TweenMax.to( this.cameraOffset, 2.5, {y:0,z:0,ease:Elastic.easeOut, onComplete:function(){ this.isAnimating = false }.bind(this)});
    //this.cameraOffset.set(0,160,460);
  },

  setActiveUser : function( user) {
    this.activeUser = user;
  },

  setState : function( state ) {
    var world = this.world;
    this.currentState = state;

    //cancel old camera movement
    clearTimeout(this.stillCameraTimeoutID);
    TweenMax.killTweensOf(this.camera.position);
    TweenMax.killTweensOf(this.target);
    this.cameraUpdateFunc = null;

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

        pos = this.target;
        pos.x += (this.env.center.x-pos.x)/24;
        pos.y += (this.env.center.y-pos.y)/24;
        pos.z += (this.env.center.z-pos.z)/24;

        this.camera.lookAt(this.target);

      }.bind(this)

    }
    else if( state == "webcamActivation"){

      this.cameraUpdateFunc = function(){
        this.moveCamera(this.activeUser.cameraPaddleSetupPosition);

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
          this.cameraOffset.x = 20*(this.activeUser.paddle.position.x/(world.bounds[1]-world.bounds[3]));

      }.bind(this);

    }
    else if( state == "gameOver") {

      var winnerCameraTransition;

      if( world.players.a.score < world.players.b.score) {
        //if player A wins
         winnerCameraTransition = {
          start: { origin: new THREE.Vector3(300,400,-1000), target: new THREE.Vector3(0,200,1000) },
          end: { origin: new THREE.Vector3(-300,400,-1000), target: new THREE.Vector3(0,200,1000), time:6 }
        }
      }
      else {
        winnerCameraTransition = {
          start: { origin: new THREE.Vector3(300,400,1000), target: new THREE.Vector3(0,200,-1000) },
          end: { origin: new THREE.Vector3(-300,400,1000), target: new THREE.Vector3(0,200,-1000), time:6 }
        }
      }

      //to initial positions
      this.camera.position = winnerCameraTransition.start.origin.clone();
      this.target = winnerCameraTransition.start.target.clone();
      this.camera.lookAt(this.target);

      //do animation
      var toOrigin = winnerCameraTransition.end.origin.clone();
      TweenMax.to(this.camera.position, winnerCameraTransition.end.time, {
        x: toOrigin.x,y: toOrigin.y,z: toOrigin.z,
        ease:Sine.easeInOut,
        onComplete: function(){
          //start automated camera
          this.currentCameraIndex = -1;
          this.nextPosition();
        }.bind(this)
      });

      var toTarget = winnerCameraTransition.end.target.clone();
      TweenMax.to(this.target, winnerCameraTransition.end.time, {
        x: toTarget.x,y: toTarget.y,z: toTarget.z,
        ease:Sine.easeInOut,
        onUpdate:function(){
          this.camera.lookAt(this.target);
        }.bind(this)
      });


    }
  },

  nextPosition : function() {

    this.currentCameraIndex++

    if(this.currentCameraIndex>this.cameraSequence.length-1) this.currentCameraIndex = 0;

    var obj = this.cameraSequence[this.currentCameraIndex];
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
          if( this.currentState == "gameOver")
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
      this.stillCameraTimeoutID = setTimeout(this.nextPosition.bind(this),obj.start.time*1000 )
    }
  },

  moveCamera : function(pointData){

    var originCurrent = this.camera.position;


      //originCurrent.x += this.cameraOffset.x;
      //originCurrent.z += this.cameraOffset.z;
      //originCurrent.y += this.cameraOffset.y;

    if( !this.isAnimating ) {
      this.cameraOffset.z *= 0.88;
      this.cameraOffset.y *= 0.88;
    }


    originCurrent.x += (pointData.origin.x+this.cameraOffset.x-originCurrent.x)/4;
    originCurrent.y += ((pointData.origin.y+this.aspectCompensationZ*2+this.cameraOffset.y)-originCurrent.y)/14;
    originCurrent.z += ((pointData.origin.z+this.aspectCompensationZ+this.cameraOffset.z)-originCurrent.z)/14;

    var targetCurrent = this.target;
    targetCurrent.x += ((pointData.target.x+this.cameraOffset.x*2)-targetCurrent.x)/4;
    targetCurrent.y += (pointData.target.y-targetCurrent.y)/24;
    targetCurrent.z += (pointData.target.z-targetCurrent.z)/24;

    this.camera.lookAt(targetCurrent);

    return originCurrent.distanceTo(pointData.origin);
  }

}


