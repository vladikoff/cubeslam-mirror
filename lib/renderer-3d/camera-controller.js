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
  this.toPosition = new THREE.Vector3( 0,0,0 );
  this.toTarget = new THREE.Vector3( 0,0,0 );
  this.isAnimating = false;
  var camera = new THREE.PerspectiveCamera( 50, 1, 10, 20000 );
  this.camera = camera;

  this.mirrored = false;

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
  this.introShown = false;
  this.hoverMix = 0;
  this.hoverPos = new THREE.Vector3();
  this.hoverTarget = new THREE.Vector3();
  this.animatedPos = new THREE.Vector3();
  this.animatedTarget = new THREE.Vector3();

  var controls = new THREE.FirstPersonControls( this.camera );
  //camera control properties
  controls.lat = -35;
  controls.lon = -90;
  controls.movementSpeed = 300;

  controls.activeLook = true;
  controls.domElement = document.getElementById('game');
  this.controls = controls

  settings.on('cameraTypeChanged', function(){
    controls.object.position = new THREE.Vector3( 0, 2000, 2000 );

  }.bind(this))

  this.aspectCompensationZ = null;
  this.cameraOffset = new THREE.Vector3();

  this.cameraPlayPosition = {
    origin: new THREE.Vector3(0,settings.data.arenaSurfaceY+settings.data.arenaSideHeight*2+300,2000),
    target:new THREE.Vector3( 0,0,300 )
  }

  this.cameraPaddleSetupPosition = {
    origin: new THREE.Vector3(-600,1600,-200 ),
    target: new THREE.Vector3( 0,300,1500)
  };

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

  setMirror: function( mirrored ) {
    this.mirrored = mirrored;
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

      if( !this.introShown ) {
        this.showIntro();
      }

      this.hoverMix = 0;

      //time used for circular motion to start from correct angle
      this.time = Date.now();

      this.cameraUpdateFunc = function(){

        var localTime = this.time-Date.now();

        var angle = this.initAngle - localTime*0.0001

       /* this.hoverPos.x += (Math.sin(-angle)*3000-this.hoverPos.x)/14;
        this.hoverPos.y += (1000-this.hoverPos.y)/14;
        this.hoverPos.z += (Math.cos(-angle)*4000-this.hoverPos.z)/14; */

        this.hoverPos.x += (Math.sin(-angle)*3000-this.hoverPos.x)/14;
        this.hoverPos.y += (3500-this.hoverPos.y)/14;
        this.hoverPos.z += ((Math.cos(-angle)*4000)-this.hoverPos.z)/14;

        this.camera.position = this.hoverPos.clone().multiplyScalar(this.hoverMix).add( this.animatedPos.clone().multiplyScalar(1-this.hoverMix) )

        this.hoverTarget.x += (0-this.hoverTarget.x)/24;
        this.hoverTarget.y += (0-this.hoverTarget.y)/24;
        this.hoverTarget.z += ((0+Math.cos(-angle)*800)-this.hoverTarget.z)/24;

        this.camera.lookAt( this.hoverTarget.clone().multiplyScalar(this.hoverMix).add( this.animatedTarget.clone().multiplyScalar(1-this.hoverMix) ));

      }.bind(this)

    }
    else if( state == "webcamActivation"){

      this.cameraUpdateFunc = null;

      var toOrigin = this.cameraPaddleSetupPosition.origin;
      var toTarget = this.cameraPaddleSetupPosition.target;

      if( this.mirrored ) {
        toOrigin.x *=-1;
        toOrigin.z *=-1;

        toTarget.x *=-1;
        toTarget.z *=-1;
      }

      TweenMax.to(this.camera.position,2, {
        x: toOrigin.x,y: toOrigin.y,z: toOrigin.z,
        ease:Sine.easeInOut
      });

      TweenMax.to(this.target, 2, {
        x: toTarget.x,y: toTarget.y,z: toTarget.z,
        ease:Sine.easeInOut,
        onUpdate:function(){
          this.camera.lookAt(this.target);
        }.bind(this)
      });

    }
    else if( state == "play" ) {

      this.cameraUpdateFunc = function(){

        if( !this.mirrored )
          this.cameraOffset.x = 50*(this.activeUser.paddle.position.x/settings.data.arenaWidth);

        this.moveCamera(this.cameraPlayPosition);
        // base camera position on users movement

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

      if( this.mirrored ) mirrorPositions([this.camera.position, this.target ])

      this.camera.lookAt(this.target);

      //do animation

      var toOrigin = winnerCameraTransition.end.origin.clone();
      var toTarget = winnerCameraTransition.end.target.clone();

      if( this.mirrored ) mirrorPositions([toTarget,toOrigin]);

      TweenMax.to(this.camera.position, winnerCameraTransition.end.time, {
        x: toOrigin.x,y: toOrigin.y,z: toOrigin.z,
        ease:Sine.easeInOut,
        onComplete: function(){
          //start automated camera
          this.currentCameraIndex = -1;
          this.nextPosition();
        }.bind(this)
      });

      TweenMax.to(this.target, winnerCameraTransition.end.time, {
        x: toTarget.x,y: toTarget.y,z: toTarget.z,
        ease:Sine.easeInOut,
        onUpdate:function(){
          this.camera.lookAt(this.target);
        }.bind(this)
      });


    }
  },

  showIntro : function(){

      this.introShown = true;

      this.animatedPos.set(5000,200,-100);
      this.animatedTarget.set(4000, -400, 0);

      TweenMax.to(this.animatedPos, 4 , {
        delay:6,
        x: 1000,y: 500,z: 0,
        ease:Sine.easeIn,
        onComplete: function(){

        }.bind(this)
      });

      TweenMax.to(this.animatedTarget, 5, {
        delay:4,
        x: 0,y: 0,z: 0,
        ease:Sine.easeInOut,
        onUpdate:function(){

        }.bind(this),
        onComplete:function(){
          this.initAngle = Math.atan2(this.camera.position.z, this.camera.position.x);
          TweenMax.to( this, 3, {hoverMix:1, ease:Sine.easeInOut})
        }.bind(this)
      });
  },

  nextPosition : function() {

    this.currentCameraIndex++

    if(this.currentCameraIndex>this.cameraSequence.length-1) this.currentCameraIndex = 0;

    var obj = this.cameraSequence[this.currentCameraIndex];
    this.camera.position = obj.start.origin.clone();
    this.target = obj.start.target.clone();

    if( this.mirrored ) mirrorPositions([ this.camera.position,this.target]);

    this.camera.lookAt(this.target);


    if( obj.end ) {
      //tween it
      var toOrigin = obj.end.origin.clone();
      var toTarget = obj.end.target.clone();

      if( this.mirrored ) mirrorPositions([toTarget,toOrigin]);

      TweenMax.to(this.camera.position, obj.end.time, {
        x: toOrigin.x,y: toOrigin.y,z: toOrigin.z,
        ease:Sine.easeInOut,
        onComplete: function(){
          if( this.currentState == "gameOver")
            this.nextPosition();
        }.bind(this)
      });

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

    if( !this.isAnimating ) {
      this.cameraOffset.z *= 0.88;
      this.cameraOffset.y *= 0.88;
    }

    this.toPosition.set(
      pointData.origin.x+this.cameraOffset.x,
      pointData.origin.y+this.aspectCompensationZ*2+this.cameraOffset.y,
      pointData.origin.z+this.aspectCompensationZ+this.cameraOffset.z
    )

    this.toTarget.set(
      pointData.target.x+this.cameraOffset.x*2,
      pointData.target.y,
      pointData.target.z
    )

    if( this.mirrored ) {
      this.toPosition.x *=-1;
      this.toPosition.z *=-1;

      this.toTarget.x *=-1;
      this.toTarget.z *=-1;
    }

    this.camera.position.lerp(this.toPosition,0.1);
    this.target.lerp( this.toTarget, 0.05);

    this.camera.lookAt(this.target);

  }

}

function mirrorPositions( positions ){

  for (var i = positions.length - 1; i >= 0; i--) {
    positions[i].x *=-1;
    positions[i].z *=-1;
  };

}


