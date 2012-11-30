var settings = require('../settings')
  , Environment = require('./environment')
  , Effects = require('./effects')
  , Materials = require('./materials')
  , Player = require('./player')
  , debug = require('debug')('renderer:3d:core')
  , camera = require('../camera')

require('./post/EffectComposer');
require('./post/RenderPass');
require('./post/MaskPass');
require('./post/ShaderPass');
require('./post/SavePass.js');
require('./post/shaders/VignetteShader');
require('./post/shaders/FilmShader');
require('./post/shaders/FXAAShader.js');
require('./post/shaders/CopyShader.js');


module.exports = Renderer;

function Renderer(canvas){
  debug('new')

  //time used for camera angle animation
  this.time = 0;

  this.canvas = canvas;
  this.scene = createScene()
  this.camera = createCamera()

  //this.skyboxCamera = createSkyboxCamera(this.scene);
  this.renderer = createRenderer(canvas,this.camera)

  this.container = createContainer(this.scene)

  this.materials = new Materials(this)
  this.env = new Environment(this)
  this.effects = new Effects(this, this.env)

  this.players = {
    a: new Player(this,0),
    b: new Player(this,1)
  }

  this.post = createPost(this.renderer,this.scene,this.camera);

  this.active = null;
  this.inactive = null;
}

Renderer.prototype = {

  // called on world.reset()
  reset: function(){
    debug('reset')

    this.players.a.reset()
    this.players.b.reset()
    this.env.reset()
    this.effects.reset()
  },

  //TODO refactor this kind of messages to renderer, paramObj to generic
  triggerEvent: function( id, paramObj ) {
    if( id == "hit") {
      //got "a" or "b" in paramObj. Used to get correct shield-material
      this.players[paramObj.player].shield.material.uniforms.uBrightness.value = 1;

      if( paramObj.player == "b" )
      this.active.cameraOffset.z = 30;

    }
    else if( id == "resetShield") {
       this.players[paramObj.player].resetShield();
    }
    else if( id == "scan") {

      this.materials.paddleSetupBox[4].uniforms.time.value = 0.8;
      setTimeout(function(){ this.materials.paddleSetupBox[4].uniforms.active.value = 2 }.bind(this),1000)
    }
    else if( id == "remoteVideoAvailable") {
      if( paramObj.visible ) {
        this.players.b.togglePiP(true)
      }
      else if( paramObj.visible ) {
        this.players.b.togglePiP(false)
      }
    }
    else if(id == "friendLeft") {
      this.inactive.cube.geometry.materials[4] = this.materials.cpu;
      this.inactive.reflection.material = this.materials.cpu;
    }
  },


  // will rotate camera to behind this player and
  // terrain/forrest to behind the other player and
  // set the correct cube type on the players
  activePlayer: function(id){
    debug('activePlayer',id)

    if( this.active && id == this.active.id ) return;

    var w = settings.data.arenaWidth
      , hw = w*.5
      , h = w/16*9
      , hh = h*0.5

    // TODO do these things through a Player#setActive(bool) instead

    // a

    if( id == 0 ){

      this.players.a.cube.geometry.materials[4] = this.materials.localVideo;
      this.players.b.cube.geometry.materials[4] = this.materials.cpu;

      this.players.b.reflection.material = this.materials.cpu;
      this.players.a.reflection.material = this.materials.localVideo;

      this.active = this.players.a;
      this.inactive = this.players.b;

      //move these?
      this.players.a.cube.rotation.y = Math.PI;
      this.players.b.cube.rotation.y = 0;

      // move the terrain behind b
      this.env.terrain.rotation.y = 0

    // b
    } else {

      this.players.a.cube.geometry.materials[4] = this.materials.cpu;
      this.players.b.cube.geometry.materials[4] = this.materials.localVideo;

      this.players.a.reflection.material = this.materials.cpu;
      this.players.b.reflection.material = this.materials.localVideo;
      //move these?
      this.players.a.cube.rotation.y = Math.PI;
      this.players.b.cube.rotation.y = 0;

      this.active = this.players.b;
      this.inactive = this.players.a;

      //this.players.a.shield.position.z = settings.data.arenaHeight*.5*this.id == 0?1:-1;
      //shieldMesh.rotation.z = Math.PI*this.id == 1?0:1;

      // move the terrain behind a
      this.env.terrain.rotation.y = Math.PI;

    }

    debug('moving camera to',this.active.cameraPosition)
  },

  changeView : function( state , callback ) {


    if( this.tweenHolder ) {
        this.tweenHolder.stop();
        this.tweenHolder2.stop();
        this.tweenHolder = null;
        this.tweenHolder2 = null;
      }

    if( state == "lobby") {

      //TODO remove temp test button trigger
       $("#scanButton").fadeOut();

      //hide paddle setup
      new TWEEN.Tween(this.env.paddleSetup.position)
        .to({y: -260},1000)
        .start();

      //hide boxes
      if(this.inactive)
        this.inactive.hide(false);
      if(this.active)
        this.active.hide(false);

      //time used for circular motion to start from correct angle
      this.time = Date.now();
      this.initAngle = Math.atan2(this.camera.position.z, this.camera.position.x) - Math.PI*.25;


      this.tweenHolder = null;
      this.tweenHolder2 = null;

      this.cameraUpdateFunc = function(){

        var localTime = this.time-Date.now();
        var pos = this.camera.position;
        var angle = this.initAngle - localTime*0.0001

        pos.x += (Math.sin(angle)*3000-pos.x)/14;
        pos.y += (2000-pos.y)/14;
        pos.z += (Math.cos(angle)*3000-pos.z)/14;

        pos = this.camera.target;
        pos.x += (this.env.center.x-pos.x)/24;
        pos.y += (this.env.center.y-pos.y)/24;
        pos.z += (this.env.center.z-pos.z)/24;

        this.camera.lookAt(this.camera.target);

      }.bind(this)
    }
    else if( state == "webcamActivation"){

      this.materials.paddleSetupBox[4].uniforms.active.value = 0;
      this.materials.paddleSetupDecal.map.offset = new THREE.Vector2( (this.active.id==0)?0:0.25,0.5);

      new TWEEN.Tween(this.env.paddleSetup.position)
        .to({y: 300},700)
        .start();

      this.cameraUpdateFunc = function(){
        var dist = this.moveCamera(this.active.cameraPaddleSetupPosition);
        if( dist < 10 ) {
          if (typeof callback === 'function') {
            callback();
            callback = null;
          }
        }

      }.bind(this);

    }
    else if( state == "paddleSetup" ) {

      this.materials.paddleSetupBox[4].uniforms.active.value = camera.active?1:0;

      //TODO remove temp test button trigger
      $("#scanButton").fadeIn();
      $("#startButton").fadeOut();

      //show paddle setup
      new TWEEN.Tween(this.env.paddleSetup.position)
      .to({y: 300},700)
      .start();

      //animate symbols
      var tweenParams = {alpha:0, x:-70};
      var paddle = this.env.paddleSetupSymbol;
      var changeSymbolTween = new TWEEN.Tween( tweenParams )
        .to({alpha: 0, x:70},200)
        .delay(2000)
        .onStart(function(){
          this.x = 0;
        })
        .onUpdate(function(){
          paddle.material.opacity = this.alpha;
          paddle.position.x = this.x;

        })
        .onComplete(function(){
          tweenParams.x = -70;
          paddle.material.map.offset.x += 0.25;
          if(paddle.material.map.offset.x > 0.75 ) paddle.material.map.offset.x = 0;
        })


      var changeSymbolBackTween = new TWEEN.Tween(tweenParams)
        .to({alpha: 1,x:0},200)
        .onStart(function(){
          this.x = -70;
        })
        .onUpdate(function(){
          paddle.material.opacity = this.alpha;
          paddle.position.x = this.x;
        })

      changeSymbolTween.chain(changeSymbolBackTween)
      changeSymbolBackTween.chain(changeSymbolTween)
      changeSymbolBackTween.start();

      this.tweenHolder = changeSymbolBackTween;
      this.tweenHolder2 = changeSymbolTween;

      //var swapTimestamp = Date.now();

      this.cameraUpdateFunc = function(){
        this.moveCamera(this.active.cameraPaddleSetupPosition);
      }.bind(this);

    }
    else if( state == "waitingForGameStart"){

      new TWEEN.Tween(this.env.paddleSetup.position)
      .to({y: -260},1000)
      .start();

      this.cameraUpdateFunc = function(){
        this.moveCamera(this.active.cameraWaitingPosition);
      }.bind(this);

    }
    else if( state == "play" ) {

      $("#startButton").fadeOut();
      $("#scanButton").fadeOut();

      //hide paddle setup
      new TWEEN.Tween(this.env.paddleSetup.position)
        .to({y: -260},1000)
        .start();

      if(this.active)
        this.active.hide(true);

      if(this.inactive)
        this.inactive.show();

      this.cameraUpdateFunc = function( world ){
        this.moveCamera(this.active.cameraPlayPosition);

        // base camera position on users movement
        if( this.active )
          this.active.cameraOffset.x = 20*(this.active.paddle.position.x/(world.bounds[1]-world.bounds[3]));

      }.bind(this);

    }

    else console.warn('unknown renderer event',arguments)
  },

  moveCamera : function(pointData){

    var originCurrent = this.camera.position;

    if( this.active ) {

      originCurrent.x += this.active.cameraOffset.x;
      originCurrent.z += this.active.cameraOffset.z;

      this.active.cameraOffset.z *= 0.88;
    }

    originCurrent.x += (pointData.origin.x-originCurrent.x)/14;
    originCurrent.y += (pointData.origin.y-originCurrent.y)/14;
    originCurrent.z += (pointData.origin.z-originCurrent.z)/14;

    var targetCurrent = this.camera.target;
    targetCurrent.x += ((pointData.target.x+this.active.cameraOffset.x*14)-targetCurrent.x)/24;
    targetCurrent.y += (pointData.target.y-targetCurrent.y)/24;
    targetCurrent.z += (pointData.target.z-targetCurrent.z)/24;

    this.camera.lookAt(targetCurrent);

    return originCurrent.distanceTo(pointData.origin);
  },

  swapToVideoTexture : function() {
    var w = settings.data.arenaWidth
      , hw = w*.5
      , h = w/16*9
      , hh = h*0.5

    new TWEEN.Tween(this.inactive.cube.position)
      .to( { y: -hh}, 500 )
      .onComplete(function(){

        this.inactive.togglePiP(false);

        this.active.cube.geometry.materials[4] = this.materials.localVideo;
        this.inactive.cube.geometry.materials[4] = this.materials.remoteVideo;
        this.inactive.reflection.material = this.materials.remoteVideo;

        new TWEEN.Tween(this.inactive.cube.position)
          .to( { y: hh }, 1000 )
          .start();
      }.bind(this))
      .start();
  },

  render: function(world,alpha){

    if (this.players) {
      this.players.a.update(world.players.a,world.paddles[world.players.a.paddle])
      this.players.b.update(world.players.b,world.paddles[world.players.b.paddle])
    }


    if( this.cameraUpdateFunc )
      this.cameraUpdateFunc(world);

    this.env.update(world)
    this.effects.update(world, alpha )
    this.materials.update(world)

    if( settings.data.usePost )
      this.post.composer.render();
    else
      this.renderer.render(this.scene, this.camera)

    TWEEN.update();
  }

}

function createCamera(){
  debug('create camera')

  var camera = new THREE.PerspectiveCamera( 50, 1, 10, 20000 );
  camera.target = new THREE.Vector3(0,0,0);
  return camera;
}

function createPost(renderer,scene,camera) {
  var w = window.innerWidth,
      h = window.innerHeight;

  //init post effect
  var effectFilm = new THREE.ShaderPass( THREE.FilmShader )
  , effectVignette = new THREE.ShaderPass( THREE.VignetteShader )
  , effectAA = new THREE.ShaderPass( THREE.FXAAShader );

  effectVignette.uniforms[ "offset" ].value = 0.9;
  effectVignette.uniforms[ "darkness" ].value = 1.3;

  effectAA.uniforms[ "resolution" ].value = new THREE.Vector2( 1 / w, 1 / h )

  effectFilm.uniforms["grayscale"].value = 0;
  effectFilm.uniforms["sCount"].value = window.innerHeight*2;
  effectFilm.uniforms["nIntensity"].value = 0.8;

  effectAA.renderToScreen = true;

  var rtParameters = { format: THREE.RGBFormat, stencilBuffer: true, overrideMaterial:new THREE.MeshBasicMaterial({wireframes:true}) };

  var rtWidth  = w
    , rtHeight = h
    , renderScene = new THREE.RenderPass( scene, camera )
    , composer1 = new THREE.EffectComposer( renderer, new THREE.WebGLRenderTarget( rtWidth, rtHeight, rtParameters ) );

  composer1.addPass( renderScene );
  composer1.addPass( effectVignette );
  composer1.addPass( effectFilm );
  composer1.addPass( effectAA );

   window.addEventListener('resize',function(){
    w = window.innerWidth;
    h = window.innerHeight;
    effectAA.uniforms[ "resolution" ].value = new THREE.Vector2( 1 / w, 1 / h );
    composer1.reset( new THREE.WebGLRenderTarget( w, h, rtParameters ) );

  },false);

  return { composer: composer1 };
}

function createRenderer(canvas,camera){
  debug('create renderer')
  var w = window.innerWidth
    , h = window.innerHeight - $('#footer').height();
  $('#game').height(h);
  var renderer = new THREE.WebGLRenderer({canvas: canvas, antialias:true});
  renderer.sortObjects = false;
  renderer.setClearColorHex(0xe5e4c6,1)
  renderer.autoClear = true;
  camera.aspect = w / h;
  renderer.setSize( w, h );
  camera.updateProjectionMatrix();

  window.addEventListener('resize',function(){
    w = window.innerWidth;
    h = window.innerHeight - $('#footer').height();
    $('#game').height(h);

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize( w, h );
  },false);
  renderer.gammaInput = true;
  renderer.gammaOutput = true;
  renderer.physicallyBasedShading = true;
  return renderer;
}

function createScene(){
  debug('create scene')
  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog( 0xe5e4c6, 8000, 14000 );
  return scene;
}

function createContainer(scene){
  debug('create container')
  var gameContainer = new THREE.Object3D();
  scene.add(gameContainer);
  return gameContainer;
}
