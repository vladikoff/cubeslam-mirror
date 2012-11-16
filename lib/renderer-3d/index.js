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

  this.canvas = canvas;
  this.camera = createCamera()
  this.renderer = createRenderer(canvas,this.camera)
  this.scene = createScene()
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

     this.changeView("play");
  },

  //TODO refactor this kind of messages to renderer, paramObj to generic
  triggerEvent: function( id, paramObj ) {
    if( id == "hit") {
      //got "a" or "b" in paramObj. Used to get correct shield-material
      this.players[paramObj.player].shield.material.uniforms.uBrightness.value = 1;
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
      //this.players.a.cube.geometry.materials = this.materials.videoCube;     
      //this.players.b.cube.geometry.materials = this.materials.cpuCube;

      this.players.a.cube.geometry.materials[4] = this.materials.localVideo;
      this.players.b.cube.geometry.materials[4] = this.materials.cpu;

      this.active = this.players.a;
      this.inactive = this.players.b;

      this.players.b.cube.rotation.y = 0;
      this.players.a.cube.rotation.y = Math.PI;

      // move the terrain behind b
      this.env.terrain.rotation.y = 0 
      

    // b
    } else {
      //this.players.b.cube.geometry.materials = this.materials.videoCube;
      //this.players.a.cube.geometry.materials = this.materials.cpuCube;
      
      this.players.a.cube.geometry.materials[4] = this.materials.cpu;
      this.players.b.cube.geometry.materials[4] = this.materials.localVideo;

      this.players.a.cube.rotation.y = Math.PI;
      this.players.b.cube.rotation.y = 0;
      
      this.active = this.players.b;
      this.inactive = this.players.a;

      // move the terrain behind a
      this.env.terrain.rotation.y = Math.PI;

    }

    new TWEEN.Tween(this.inactive.cube.position)
      .to({y: hh },1000)
      .start();
    new TWEEN.Tween(this.active.cube.position)
      .to({y:-hh},1000)
      .start();

      /*
    this.camera.lookAt(this.env.center)
    new TWEEN.Tween(this.camera.position)
      .delay(1000)
      .to(this.active.cameraPosition,2400)
      .onUpdate(function(){
        this.camera.lookAt(this.env.center);
      }.bind(this))
      .start();*/

    debug('moving camera to',this.active.cameraPosition)
  },

  changeView : function( state ) { 

    //refactor this method to tie better into the state workflow

    if( state == "lobby") {
      
      this.time = Date.now();

      var x = this.camera.position.x;
      var z = this.camera.position.z;

      this.initAngle = Math.atan2(z, -x) - Math.PI*.25;

      this.cameraUpdateFunc = function(){

        var localTime = this.time-Date.now();
        var pos = this.camera.position;
        var angle = this.initAngle - localTime*0.0005

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
      this.cameraUpdateFunc = function(){
        this.moveCamera(this.active.cameraPaddleSetupPosition);
      }.bind(this);
    }
    else if( state == "play" ) {
      
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

        new TWEEN.Tween(this.inactive.cube.position)
          .to( { y: hh }, 1000 )
          .start();
      }.bind(this))
      .start();
  },

  render: function(world,alpha){
    
    this.players.a.update(world.players.a)
    this.players.b.update(world.players.b)

    // base camera position on users movement
    /*if( this.active )
      this.camera.position.x = 40*(this.active.paddle.position.x/world.bounds.width-0.5);
    */
    
    if( this.cameraUpdateFunc ) this.cameraUpdateFunc();
    this.env.update(world)
    this.materials.update(world)

    this.renderer.render(this.scene, this.camera)

    TWEEN.update();
  }

}

function createCamera(){
  debug('create camera')
  var camera = new THREE.PerspectiveCamera( 50, 1, 10, 14000 );
  camera.target = new THREE.Vector3(0,0,0);
  return camera;
}

function createRenderer(canvas,camera){
  debug('create renderer')
  var w = window.innerWidth
    , h = window.innerHeight;
  var renderer = new THREE.WebGLRenderer({canvas: canvas, antialias:true});
  renderer.sortObjects = false;
  renderer.setClearColorHex(0xe5e4c6,1)
  renderer.autoClear = true;
  camera.aspect = w / h;
  renderer.setSize( w, h );
  window.addEventListener('resize',function(){
    w = window.innerWidth;
    h = window.innerHeight;
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