var debug = require('debug')('renderer:3d:camera')
  , settings = require('../settings')
  , $ = require('jquery');

module.exports = CameraController;

// Camera
//   - puckTrails[]
//   #update(world)

function CameraController(){
  debug('new')
  this.currentState = null;
  this.toPosition = new THREE.Vector3( 0,0,0 );
  this.toTarget = new THREE.Vector3( 0,0,0 );
  this.isAnimating = false;
  var camera = new THREE.PerspectiveCamera( settings.data.cameraFov, 1, 10, 14000 );
  camera.useQuaternion = true;
  this.camera = camera;

  this.mirrored = false;

  var w = window.innerWidth
    , h = window.innerHeight - $('#footer').height();

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  camera.position.set(5000,200,-100);
  this.target = new THREE.Vector3(4000,-400,0);
  camera.lookAt(this.target);

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

  var controls = new THREE.FirstPersonControls( this.camera , $('#fpsCameraCapture')[0]);
  controls.lat = -35;
  controls.lon = -90;
  controls.movementSpeed = 300;

  controls.activeLook = true;
  this.controls = controls

  settings.on("cameraSettingsChanged", function(){
    console.log(camera.fov , settings.data.cameraFov);
    camera.fov = settings.data.cameraFov;
    camera.updateProjectionMatrix();
  }.bind(this))

  settings.on('cameraTypeChanged', function(){

    var camCapStyle = document.getElementById("fpsCameraCapture").style;
    //reset if has been fps
    camCapStyle.display = 'none'
    camCapStyle.zIndex = 1;

    switch( settings.data.cameraType ) {
      case settings.CAMERA_SCRIPTED:
        $(".state").css("opacity",1)
        break;
      case settings.CAMERA_FPS:
        $(".state").css("opacity",0)
        camCapStyle.display = 'block'
        camCapStyle.zIndex = 100;
        controls.object.position = new THREE.Vector3( 0, 2000, 2000 );
        break;
      case settings.CAMERA_CLASSIC:
        camera.position.set(0,3000,0)
        camera.rotation.y = Math.PI*.5;
        camera.lookAt(new THREE.Vector3(0,0,0));
        break;
      case settings.CAMERA_RABBIT:
        $(".state").css("opacity",0)
        this.camera.position.set(0,20,-20);
        this.camera.lookAt( new THREE.Vector3(0,0,100));
        break;
      case settings.CAMERA_MOUNTAINVIEW:
        this.camera.position.set(3962,1999,-9929);
        this.camera.lookAt( new THREE.Vector3(3127,1505,-8180));
        break;
    }

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
      start: { origin: new THREE.Vector3(4430,2243,2390), target: new THREE.Vector3(2991,1131,1557)},
      end: { origin: new THREE.Vector3(5074,1053,2808), target: new THREE.Vector3(3375,384,1993),  time:4 , ease:Sine.easeInOut  }
    },
    {
      start: { origin: new THREE.Vector3(-589,46,1336), target: new THREE.Vector3(-1594,-17,-386)},
      end: { origin: new THREE.Vector3(-435,151,-143), target: new THREE.Vector3(-1532,-139,1483),  time:4 , ease:Sine.easeInOut  }
    },
    {
      start: { origin: new THREE.Vector3(-82,503,5321), target: new THREE.Vector3(-73,483,5223)  },
      end: { origin: new THREE.Vector3(91,2076,4146), target: new THREE.Vector3(86,1326,3059),  time:5, ease:Sine.easeIn  }
    },
    {
      start: { origin: new THREE.Vector3(-2000,100,0), target: new THREE.Vector3(0,100,1000) },
      end: { origin: new THREE.Vector3(-2000,1000,0), target: new THREE.Vector3(10,100,-1000), time:3,ease:Sine.easeIn }
    },
    {
      start: {origin: new THREE.Vector3(-7811,594,4134), target: new THREE.Vector3(-6130,243,3109)  },
      end: {origin: new THREE.Vector3(222,332,-517), target: new THREE.Vector3(1784,0,-1762),  time:6, ease:Linear.easeNone  }
    },
    {
      start: {origin: new THREE.Vector3(-2285,8856,298), target: new THREE.Vector3(-2111,6863,298)},
      end: {origin: new THREE.Vector3(-1735,4753,288), target: new THREE.Vector3(-1364,2788,292),   time:6, ease:Linear.easeNone  }
    }
    /*,
    {
      start: { origin: new THREE.Vector3(1000,200,1000), target: new THREE.Vector3(0,200,-1000), time:3 },
    }*/
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

  attachTo: function( target ) {
    target.add(this.camera);
  },

  update: function(world,alpha){
    switch( settings.data.cameraType ) {
      case settings.CAMERA_SCRIPTED:
        if( this.cameraUpdateFunc ) {
          this.cameraUpdateFunc(world);
        }
        break;
      case settings.CAMERA_FPS:
        this.controls.update(0.1);
        break;
      case settings.CAMERA_CLASSIC:
        break;
      case settings.CAMERA_RABBIT:
        break;
    }

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

  setActiveUser : function(user) {
    this.activeUser = user;
  },

  setState : function( state ) {
    this.currentState = state;

    //cancel old camera movement
    clearTimeout(this.stillCameraTimeoutID);
    TweenMax.killTweensOf(this.camera.position);
    TweenMax.killTweensOf(this.target);
    this.cameraUpdateFunc = null;

    if( state == "main-menu" ) {

      if( !this.introShown ) {
        this.showIntro();
        this.hoverMix = 0;
      }
      else {
        this.hoverMix = 1;
      }

      //time used for circular motion to start from correct angle
      this.time = Date.now();

      this.cameraUpdateFunc = function(){

        var localTime = this.time-Date.now();

        var angle = this.initAngle - localTime*0.0001

        this.hoverPos.x += (Math.sin(-angle)*3000-this.hoverPos.x)/14;
        this.hoverPos.y += (3500-this.hoverPos.y)/14;
        this.hoverPos.z += ((Math.cos(-angle)*4000)-this.hoverPos.z)/14;

        this.camera.position = this.hoverPos.clone().multiplyScalar(this.hoverMix).add( this.animatedPos.clone().multiplyScalar(1-this.hoverMix) )

        this.hoverTarget.x += (0-this.hoverTarget.x)/24;
        this.hoverTarget.y += (0-this.hoverTarget.y)/24;
        this.hoverTarget.z += ((0+Math.cos(-angle)*800)-this.hoverTarget.z)/24;

        this.target = this.hoverTarget.clone().multiplyScalar(this.hoverMix).add( this.animatedTarget.clone().multiplyScalar(1-this.hoverMix) )

        this.camera.lookAt(this.target);

      }.bind(this)

    }
    else if( state == "webcamActivation"){

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

      var toOrigin = this.cameraPlayPosition.origin.clone();
      var toTarget = this.cameraPlayPosition.target.clone();

      toOrigin.set(
        toOrigin.x+this.cameraOffset.x,
        toOrigin.y+this.aspectCompensationZ*2+this.cameraOffset.y,
        toOrigin.z+this.aspectCompensationZ+this.cameraOffset.z
      )

      toTarget.set(
        toTarget.x+this.cameraOffset.x*2,
        toTarget.y,
        toTarget.z
      )

      if( this.mirrored ) {
        toOrigin.x *=-1;
        toOrigin.z *=-1;

        toTarget.x *=-1;
        toTarget.z *=-1;
      }

      TweenMax.to(this.camera.position, 2, {
        x: toOrigin.x,y: toOrigin.y,z: toOrigin.z,
        ease:Sine.easeInOut,
        onComplete: function(){
          this.cameraUpdateFunc = function(){

            if( !this.mirrored )
              this.cameraOffset.x = 50*(this.activeUser.paddle.position.x/settings.data.arenaWidth);

            this.moveCamera(this.cameraPlayPosition);
            // base camera position on users movement

          }.bind(this);
        }.bind(this)
      });

      TweenMax.to(this.target, 2, {
        x: toTarget.x,y: toTarget.y,z: toTarget.z,
        ease:Sine.easeInOut,
        onUpdate:function(){
          this.camera.lookAt(this.target);
        }.bind(this)
      });

    }
    else if( state == "gameOver") {
      this.currentCameraIndex = -1;
      this.nextPosition();
    }
  },

  showIntro : function(){

      this.introShown = true;

      if( settings.data.quality === settings.QUALITY_MOBILE) {
        this.animatedPos.set(5000,600,-100);
        this.animatedTarget.set(3000,200,0);
      }
      else {
        this.animatedPos.set(5000,200,-100);
        this.animatedTarget.set(4000,-400,0);
      }



      TweenMax.to(this.animatedPos, 4 , {
        delay:1,
        x: 1000,y: 500,z: 0,
        ease:Sine.easeIn,
        onComplete: function(){

        }.bind(this)
      });

      TweenMax.to(this.animatedTarget, 3, {
        delay:1,
        x: 0,y: 0,z: 0,
        ease:Sine.easeInOut,
        onUpdate:function(){

        }.bind(this),
        onComplete:function(){
          this.initAngle = Math.atan2(this.camera.position.z, this.camera.position.x);
          TweenMax.to( this, 2, {hoverMix:1, ease:Sine.easeInOut})
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
        ease:obj.end.ease,
        onComplete: function(){
          if( this.currentState == "gameOver")
            this.nextPosition();
        }.bind(this)
      });

      TweenMax.to(this.target, obj.end.time, {
        x: toTarget.x,y: toTarget.y,z: toTarget.z,
        ease:obj.end.ease,
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

    this.camera.position.lerp(this.toPosition,0.05);
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


