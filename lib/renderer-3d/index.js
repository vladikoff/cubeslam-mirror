var settings = require('../settings')
  , Environment = require('./environment')
  , Player = require('./player');

module.exports = Renderer;

function Renderer(canvas){
  this.initiated = false;
  this.camera = createCamera()
  this.renderer = createRenderer(canvas)
  this.scene = createScene()
  this.container = createContainer(this.scene)
  this.players = {
    a: new Player(this),
    b: new Player(this)
  }
  this.shaders = require('../shaders')
  this.geometry = require('../geometry')
  this.materials = new Materials(this)
  this.env = new Environment(this)
}

Renderer.prototype = {

  activePlayer: function(player){
    // will rotate camera to behind this player and 
    // terrain/forrest to behind the other player and
    // set the correct cube type on the players
  },

  render: function(world,alpha){
    this.players.a.update(world.players.a)
    this.players.b.update(world.players.b)

    this.env.update(world)
    this.materials.update()

    this.renderer.render(this.scene, this.camera)

    TWEEN.update();
  }

}


function createCamera(){
  var camera = new THREE.PerspectiveCamera( 60, w/h, 10, 14000 );
  camera.position.x = 200;
  camera.position.y = 2220;
  camera.position.z = 0;
  return camera;
}

function createRenderer(canvas){
  var w = window.innerWidth
    , h = window.innerHeight;
  var renderer = new THREE.WebGLRenderer({canvas: canvas, antialias:true});
  renderer.sortObjects = false;
  renderer.setClearColorHex(0xe5e4c6,1)
  renderer.autoClear = true;
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
}