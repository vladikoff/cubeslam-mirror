var settings = require('../settings')
  , Environment = require('./environment')
  , Materials = require('./materials')
  , Player = require('./player')


module.exports = Renderer;

function Renderer(canvas){
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

  reset: function(){
    this.camera.position.x = 200;
    this.camera.position.y = 2220;
    this.camera.position.z = 0;
    this.players.a.reset()
    this.players.b.reset()
    this.env.reset()
  },

  triggerEvent: function( id, paramObj ) {
    if( id == "hit") {
      if(paramObj.side == 1) {
        this.players.b.shield.material.uniforms.uBrightness.value = 1;
      }
      else {
        this.players.a.shield.material.uniforms.uBrightness.value = 1;
      }
    }
  },


  // will rotate camera to behind this player and 
  // terrain/forrest to behind the other player and
  // set the correct cube type on the players
  activePlayer: function(id){
    var w = settings.data.arenaWidth
      , hw = w*.5 
      , h = w/16*9
      , hh = h*0.5

    // a
    if( id == 0 ){
      this.players.a.active = true;
      this.players.a.cube.geometry.materials = this.materials.videoCube;
      this.players.b.cube.geometry.materials = this.materials.cpuCube;
      this.active = this.players.a;
      this.inactive = this.players.b;

      this.env.terrain.rotation.y = 0

    // b
    } else {
      this.players.b.active = true;
      this.players.b.cube.geometry.materials = this.materials.videoCube;
      this.players.a.cube.geometry.materials = this.materials.cpuCube;
      this.active = this.players.b;
      this.inactive = this.players.a;

      // move the terrain behind a
      this.env.terrain.rotation.y = Math.PI

    }

    new TWEEN.Tween(this.inactive.cube.position)
      .to({y:hh},3000)
      .start();
    new TWEEN.Tween(this.active.cube.position)
      .to({y:-hh},3000)
      .start();

    this.camera.lookAt(this.env.center)
    new TWEEN.Tween(this.camera.position)
      .delay(1000)
      .to(this.active.cameraPosition,2400)
      .onUpdate(function(){
        this.camera.lookAt(this.env.center);
      }.bind(this))
      .start();
  },

  swapToVideoTexture : function() {
    var w = settings.data.arenaWidth
      , hw = w*.5 
      , h = w/16*9
      , hh = h*0.5

    new TWEEN.Tween(this.inactive.cube.position)
      .to( { y: -hh}, 500 )
      .onComplete(function(){
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
    // if( this.active )
    //   this.camera.position.x = 40*(this.active.paddle.position.x-0.5);

    this.env.update(world)
    this.materials.update(world)

    this.renderer.render(this.scene, this.camera)

    TWEEN.update();
  }

}


function createCamera(){
  var camera = new THREE.PerspectiveCamera( 60, 1, 10, 14000 );
  camera.position.x = 200;
  camera.position.y = 2220;
  camera.position.z = 0;
  return camera;
}

function createRenderer(canvas,camera){
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
  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog( 0xe5e4c6, 5000, 10000 );
  return scene;
}

function createContainer(scene){
  var gameContainer = new THREE.Object3D();
  scene.add(gameContainer);
  return gameContainer;
}