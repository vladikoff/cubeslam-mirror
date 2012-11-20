var settings = require('../settings')
  , Environment = require('./environment')
  , Materials = require('./materials')
  , Player = require('./player')
  , debug = require('debug')('renderer:3d:core')


module.exports = Renderer;

function Renderer(canvas){
  debug('new')

  //time used for camera angle animation
  this.time = 0;

  canvas.parentNode.className += ' renderer-2d';
  this.canvas = canvas;
  this.scene = createScene()
  this.camera = createCamera()

  //this.skyboxCamera = createSkyboxCamera(this.scene);
  this.renderer = createRenderer(canvas,this.camera)

  this.container = createContainer(this.scene)

  this.materials = new Materials(this)
  this.env = new Environment(this)

  this.players = {
    a: new Player(this,0),
    b: new Player(this,1)
  }

  this.active = null;
  this.inactive = null;
}

Renderer.prototype = {

  // called on world.reset()
  reset: function(){
    debug('reset')
    this.camera.position.set(200,2220,0)
    this.camera.lookAt(this.scene.position)
    this.players.a.reset()
    this.players.b.reset()
    this.env.reset()
  },

  //TODO refactor this kind of messages to renderer, paramObj to generic
  triggerEvent: function( id, paramObj ) {
    if( id == "hit") {
      //got "a" or "b" in paramObj. Used to get correct shield-material
      this.players[paramObj.player].shield.material.uniforms.uBrightness.value = 1;

    }
    else if( id == "resetShield") {
       this.players[paramObj.player].resetShield();
    }
    else if( id == "scan") {

      this.materials.paddleSetupBox[4].uniforms.time.value = 0.8;
    }
    else if( id == "webcamEnabled") {
      this.materials.paddleSetupBox[4].uniforms.active.value = 1.8;
      this.tracker = paramObj.tracker;
    }
  },


  // will rotate camera to behind this player and
  // terrain/forrest to behind the other player and
  // set the correct cube type on the players
  activePlayer: function(id){
    debug('activePlayer',id)
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

      //TODO remove hardcoded state change
      this.changeView("lobby");

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

  changeView : function( state ) {

    if( state == "lobby") {

      //TODO remove temp test button trigger
       $("#scanButton").fadeOut();

      //hide paddle setup
      new TWEEN.Tween(this.env.paddleSetup.position)
        .to({y: -320},1000)
        .start();

      //hide boxes
      if(this.inactive)
        this.inactive.hide(false);
      if(this.active)
        this.active.hide(false);


      //time used for circular motion to start from correct angle
      this.time = Date.now();
      this.initAngle = Math.atan2(this.camera.position.z, this.camera.position.x) - Math.PI*.25;

      this.cameraUpdateFunc = function(){

        var localTime = this.time-Date.now();
        var pos = this.camera.position;
        var angle = this.initAngle - localTime*0.0001

        pos.x += (Math.sin(angle)*1500-pos.x)/14;
        pos.z += (Math.cos(angle)*1500-pos.z)/14;
        pos.y += (3000-pos.y)/14;

        pos = this.camera.target;
        pos.x += (this.env.center.x-pos.x)/24;
        pos.z += (this.env.center.z-pos.z)/24;
        pos.y += (this.env.center.y-pos.y)/24;

        this.camera.lookAt(this.camera.target);

      }.bind(this)
    }
    else if( state == "paddleSetup" ) {

      //TODO remove temp test button trigger
      $("#scanButton").fadeIn();
      $("#startButton").fadeOut();

      //show paddle setup
      new TWEEN.Tween(this.env.paddleSetup.position)
      .to({y: 300},700)
      .start();

      this.cameraUpdateFunc = function(){
        this.moveCamera(this.active.cameraPaddleSetupPosition);

      }.bind(this);

    }
    else if( state == "play" ) {

      $("#startButton").fadeOut();
      $("#scanButton").fadeOut();
      //hide paddle setup
      new TWEEN.Tween(this.env.paddleSetup.position)
      .to({y: -320},1000)
      .start();

      if(this.active)
        this.active.hide(true);

      if(this.inactive)
        this.inactive.show();


      this.cameraUpdateFunc = function(){
        this.moveCamera(this.active.cameraPlayPosition);
      }.bind(this);

    }
  },

  moveCamera : function(pointData){
    var originCurrent = this.camera.position;

        var originCurrent = this.camera.position;
        originCurrent.x += (pointData.origin.x-originCurrent.x)/14;
        originCurrent.z += (pointData.origin.z-originCurrent.z)/14;
        originCurrent.y += (pointData.origin.y-originCurrent.y)/14;

        var targetCurrent = this.camera.target;
        targetCurrent.x += (pointData.target.x-targetCurrent.x)/24;
        targetCurrent.z += (pointData.target.z-targetCurrent.z)/24;
        targetCurrent.y += (pointData.target.y-targetCurrent.y)/24;

        this.camera.lookAt(targetCurrent);
  },

  swapToVideoTexture : function() {
    var w = settings.data.arenaWidth
      , hw = w*.5
      , h = w/16*9
      , hh = h*0.5

    new TWEEN.Tween(this.inactive.cube.position)
      .to( { y: -hh}, 500 )
      .onComplete(function(){

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

    // base camera position on users movement
    /*if( this.active )
      this.camera.position.x = 40*(this.active.paddle.position.x/world.bounds.width-0.5);
    */

    if(this.tracker) {
      // LOL
      var c = this.tracker.buffer[1].getContext("2d").getImageData( 0.5*320/4, 0.8*240/4, 1, 1).data;
      this.materials.colorPreview.color = new THREE.Color(0xffffff).setRGB(c[0]/255,c[1]/255,c[2]/255);
    }


    if( this.cameraUpdateFunc )
      this.cameraUpdateFunc();


    this.env.update(world)
    this.materials.update(world)

    this.renderer.render(this.scene, this.camera)

    //this.post.composer.render();

    TWEEN.update();
  }

}

function createCamera(){
  debug('create camera')

  var camera = new THREE.PerspectiveCamera( 50, 1, 10, 14000 );
  camera.target = new THREE.Vector3(0,0,0);
  return camera;
}

function createPost(renderer,scene,camera) {
  var w = window.innerWidth,
      h = window.innerHeight;

  //init post effect

 // var shaderBleach = THREE.ShaderExtras[ "bleachbypass" ];
  //var shaderSepia = THREE.ShaderExtras[ "sepia" ];
  var shaderVignette = THREE.ShaderExtras[ "vignette" ];
  //var shaderScreen = THREE.ShaderExtras[ "screen" ];

  //var effectBleach = new THREE.ShaderPass( shaderBleach );
  //var effectSepia = new THREE.ShaderPass( shaderSepia );
  var effectVignette = new THREE.ShaderPass( shaderVignette );
  //var effectScreen = new THREE.ShaderPass( shaderScreen );

  //effectBleach.uniforms[ "opacity" ].value = 0.95;
  //effectSepia.uniforms[ "amount" ].value = 0.1;
  effectVignette.uniforms[ "offset" ].value = 0.95;
  effectVignette.uniforms[ "darkness" ].value = 1.6;
  effectVignette.renderToScreen = true;

  /*var effectColorify1 = new THREE.ShaderPass( THREE.ShaderExtras[ "colorify" ] );
  var effectColorify2 = new THREE.ShaderPass( THREE.ShaderExtras[ "colorify" ] );
  effectColorify1.uniforms[ 'color' ].value.setRGB( 1, 0.8, 0.8 );
  effectColorify2.uniforms[ 'color' ].value.setRGB( 1, 0.75, 0.5 );


*/

  var rtParameters = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, stencilBuffer: false };

  var rtWidth  = w;
  var rtHeight = h;

  var renderScene = new THREE.RenderPass( scene, camera );

  var composer1 = new THREE.EffectComposer( renderer, new THREE.WebGLRenderTarget( rtWidth, rtHeight, rtParameters ) );

  composer1.addPass( renderScene );
  //composer1.addPass( renderMask );
 // composer1.addPass( effectColorify1 );
  //composer1.addPass( effectSepia );
  //composer1.addPass( clearMask );
  composer1.addPass( effectVignette );
 // composer1.addPass(effectScreen);

   window.addEventListener('resize',function(){
    w = window.innerWidth;
    h = window.innerHeight;
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
  scene.fog = new THREE.Fog( 0xe5e4c6, 5000, 12000 );
  return scene;
}

function createContainer(scene){
  debug('create container')
  var gameContainer = new THREE.Object3D();
  scene.add(gameContainer);
  return gameContainer;
}
