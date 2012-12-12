var settings = require('../settings')
  , Environment = require('./environment')
  , Effects = require('./effects')
  , Animals = require('./animals')
  , Materials = require('./materials')
  , Player = require('./player')
  , debug = require('debug')('renderer:3d:core')
  , world = require('../world')
  , $ = require('jquery');

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
  this.projector = new THREE.Projector();
  this.mouse2d = new THREE.Vector3(0,0,0);
  this.time = 0;
  this.currentState = "";
  this.canvas = canvas;
  this.scene = createScene()
  this.camera = createCamera()
  this.renderer = createRenderer(canvas,this.camera)
  this.container = createContainer(this.scene)

  this.env = new Environment(this)
  this.effects = new Effects(this, this.env)
  this.animals = new Animals(this, this.env)

  this.players = {
    a: new Player(this,0),
    b: new Player(this,1)
  }

  this.post = createPost(this.renderer,this.scene,this.camera);

  this.active = null;
  this.inactive = null;

  this.updateScore = false;

  this.activePlayer(0);

  this.testShere = new THREE.Mesh( new THREE.SphereGeometry(50,13,13), new THREE.MeshBasicMaterial({color:0x999999}))
  this.testShere.position.z = settings.data.arenaHeight*.5 
  this.testShere.position.y = -50 
  this.scene.add(this.testShere)
  window.addEventListener( 'mousemove', onDocumentMouseMove.bind(this), false );
}

Renderer.prototype = {

  // called on world.reset()
  reset: function(){
    debug('reset');

    this.players.a.reset()
    this.players.b.reset()
    this.env.reset()
    this.effects.reset()
    this.updateScore = true;
  },

  triggerEvent: function( id, paramObj ) {
    switch(id){
      case 'hit':
        // got "a" or "b" in paramObj. Used to get correct shield-material
        this.players[paramObj.player].shield.material.uniforms.uBrightness.value = 2;
        if( paramObj.player == "b" )
          this.active.cameraOffset.z = 30;
        this.updateScore = true;
        break;

      case 'resetShield':
        this.players[paramObj.player].resetShield();
        this.animals.triggerEvent( "bear_win" );
        this.updateScore = true;
        break;

      case 'paddleHit':
      case 'updateScore':
        this.updateScore = true;
        break;

      case 'localVideoAvailable':
        this.active.cube.geometry.materials[4] = Materials.localVideo;
        this.active.reflection.material = Materials.localVideo;
        break;

      case 'friendLeft':
        this.inactive.cube.geometry.materials[4] = Materials.cpu;
        this.inactive.reflection.material = Materials.cpu;
        break;

      case 'heal':
        this.players[paramObj.player].heal();
        break;

      case 'gameOver':
        this.animals.triggerEvent( "bear_win" );
        break;

      default:
        console.warn('unexpected event "%s"',id);
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

    // a
    if( id == 0 ){

      this.active = this.players.a;
      this.inactive = this.players.b;

      //move these?
      this.players.a.cube.rotation.y = Math.PI;
      this.players.b.cube.rotation.y = 0;

      // move the terrain behind b
      this.env.terrain.rotation.y = 0

    // b
    } else {
      this.active = this.players.b;
      this.inactive = this.players.a;

      //move these?
      this.players.a.cube.rotation.y = Math.PI;
      this.players.b.cube.rotation.y = 0;

      // move the terrain behind a
      this.env.terrain.rotation.y = Math.PI;

    }

    debug('moving camera to',this.active.cameraPosition)
  },

  changeView : function( state , callback ) {

    if( this.currentState == state ) {
      if (typeof callback === 'function') {
        callback();
      }
      return;
    }

    this.currentState = state;

    if( this.tweenHolder ) {
        this.tweenHolder.stop();
        this.tweenHolder2.stop();
        this.tweenHolder = null;
        this.tweenHolder2 = null;
      }

    if( state == "lobby") {

      //hide boxes
      this.players.a.gotoIdleState()
      //this.players.a.show(true)
      this.players.b.gotoIdleState()
      //this.players.b.show(true)

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

      this.active.setMaterial( Player.CubeMaterialNoise )

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

    else if( state == "waitingForGameStart"){

      this.cameraUpdateFunc = function(){
        this.moveCamera(this.active.cameraWaitingPosition);
      }.bind(this);

    }
    else if( state == "play" ) {

      if(world.host ) {

        this.players.a.setMaterial( Player.CubeMaterialLocal, true );
        this.players.b.setMaterial( world.multiplayer ? Player.CubeMaterialRemote:Player.CubeMaterialCPU )
      }
      else {
        this.players.b.setMaterial( Player.CubeMaterialLocal, true )
        this.players.a.setMaterial( world.multiplayer ? Player.CubeMaterialRemote:Player.CubeMaterialCPU )
      }


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

    originCurrent.x += (pointData.origin.x+this.active.cameraOffset.x-originCurrent.x)/4;
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

        this.active.cube.geometry.materials[4] = Materials.localVideo;
        this.inactive.cube.geometry.materials[4] = Materials.remoteVideo;
        this.inactive.reflection.material = Materials.remoteVideo;

        new TWEEN.Tween(this.inactive.cube.position)
          .to( { y: hh }, 1000 )
          .start();
      }.bind(this))
      .start();
  },

  getWorldCoordinate : function( screen2D ) {
    //update screen to world coordinates;
    var vector = screen2D.clone();

    this.projector.unprojectVector( vector, this.camera );

    var dir = vector.subSelf( this.camera.position ).normalize();
    var ray = new THREE.Ray( this.camera.position, dir );
    var distance = (settings.data.arenaHeight*.5 - (this.camera.position.z-this.active.cameraOffset.z)) / dir.z;
    var pos = this.camera.position.clone().addSelf( dir.multiplyScalar( distance ) );

    return ((pos.x/settings.data.arenaWidth) + 1)/2;

  },

  render: function(world,alpha){

    if (this.players) {
      this.players.a.update(world.players.a,world.paddles[world.players.a.paddle])
      this.players.b.update(world.players.b,world.paddles[world.players.b.paddle])
    }

    if( this.cameraUpdateFunc )
      this.cameraUpdateFunc(world);

    //debug only
    var vector = this.mouse2d.clone();

    this.projector.unprojectVector( vector, this.camera );

    var dir = vector.subSelf( this.camera.position ).normalize();
    var ray = new THREE.Ray( this.camera.position, dir );
    var distance = (settings.data.arenaHeight*.5 - (this.camera.position.z-this.active.cameraOffset.z)) / dir.z;
    var pos = this.camera.position.clone().addSelf( dir.multiplyScalar( distance ) );
    this.testShere.position.x = pos.x;
    //

    this.env.update(world)
    this.effects.update(world, alpha )
    this.animals.update(world)
    Materials.update(world)

    if( settings.data.usePost )
      this.post.composer.render();
    else
      this.renderer.render(this.scene, this.camera)

    if( this.updateScore ){
      $("#scorePoints").html(world.players.a.score + "-" + world.players.b.score)
      $("#scoreRally").html(world.alive)
      this.updateScore = false;
    }

    TWEEN.update();
  }

}

function onDocumentMouseMove( event ) {
  this.mouse2d.x = (event.clientX / window.innerWidth ) * 2 - 1;
  this.mouse2d.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
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
  effectVignette.uniforms[ "darkness" ].value = 1.1;

  effectAA.uniforms[ "resolution" ].value = new THREE.Vector2( 1 / w, 1 / h )

  effectFilm.uniforms["grayscale"].value = 0;
  effectFilm.uniforms["sCount"].value = window.innerHeight*2;
  effectFilm.uniforms["nIntensity"].value = 0.6;

  effectAA.renderToScreen = true;

  var rtParameters = { format: THREE.RGBFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, stencilBuffer: true };

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
  renderer.setClearColorHex(0xedecd6,1)
  renderer.autoClear = true;
  camera.aspect = w / h;
  renderer.setSize( w, h );
  camera.updateProjectionMatrix();

  Materials.setMaxAnisotropy(renderer.getMaxAnisotropy());

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
  scene.fog = new THREE.Fog( 0xedecd6, 8000, 14000 );
  return scene;
}

function createContainer(scene){
  debug('create container')
  var gameContainer = new THREE.Object3D();
  scene.add(gameContainer);
  return gameContainer;
}
