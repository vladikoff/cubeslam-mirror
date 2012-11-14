
var settings = require('../settings')
  , shaders = require('../shaders')
  , geometry = require('../geometry')
  , debug = require('debug')('renderer:3d:materials')

module.exports = Materials;

function Materials(renderer){
  debug('new')
  this.paddle = new THREE.MeshLambertMaterial({shading: THREE.FlatShading, color:0xffffff});
  this.arenaSideFaces = new THREE.MeshFaceMaterial();
  this.centerLine = new THREE.MeshLambertMaterial({color:0xe5e4c6, side:THREE.DoubleSide})
  this.arenaTransMaterial = createArenaTransMaterial();
  this.arenaSideMaterials = createArenaSideMaterials()
  this.arenaGrid = createArenaGrid(renderer)
  this.reflectionBox = new THREE.MeshBasicMaterial({color:0x000000, side:THREE.DoubleSide})
  this.videoCube = createCubeMaterial('video')
  this.cpuCube = createCubeMaterial('cpu')
  this.remoteVideo = createTexture('remoteInput')
  this.terrainShadow = createShadow()
  this.treeBranches = new THREE.MeshLambertMaterial({color:0x0e64bb,shading: THREE.FlatShading});
  this.treeTrunk = new THREE.MeshLambertMaterial({color:0x0c5ea7,shading: THREE.FlatShading})
}

Materials.prototype.update = function(world){
  var tex = this.remoteVideo.map;
  if( tex && tex.image.readyState === tex.image.HAVE_ENOUGH_DATA )
    tex.needsUpdate = true;

  // update eyes
  if( world.pucks.length ){
    var p = world.pucks[0].current
      , u = this.cpuCube[4].uniforms;
    u.mouse.value.x = p.x;
    u.mouse.value.y = p.y;
    u.time.value += 0.01;
  }

  // arena colors
  // TODO move this to level change or settings change
  if( this.arenaTransMaterial.color.getHex() != settings.data.arenaColor) {
    this.arenaTransMaterial.color.setHex( settings.data.arenaColor );
    this.arenaSideMaterials[0].color.setHex( settings.data.arenaColor );
  }
}


function createArenaGrid(renderer){
  var gridTexture = THREE.ImageUtils.loadTexture( "images/grid.png" );
  gridTexture.mapping = THREE.UVMapping;
  gridTexture.anisotropy = renderer.renderer.getMaxAnisotropy();
  gridTexture.minFilter = gridTexture.magFilter = THREE.LinearMipMapLinearFilter;
  gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;

  return new THREE.ShaderMaterial({
    depthWrite: false,
    transparent: true,
    uniforms: {
      tGrid: { type: "t", value: gridTexture},
      scale: { type: "v2", value: new THREE.Vector2(settings.data.arenaColumns , 30 ) }
    },
    vertexShader: shaders.simple_vs,
    fragmentShader: shaders.arena_fs
  });
}

function createArenaTransMaterial(){
  return new THREE.MeshPhongMaterial({
    color: settings.data.arenaColor, 
    opacity:0.8,
    transparent:true,
    depthWrite:false
  })
}

function createArenaSideMaterials(){
  var arenaSideMaterialWhite = new THREE.MeshLambertMaterial({color:0xe5e4c6})
    , arenaSideMaterialColor = new THREE.MeshLambertMaterial({color:settings.data.arenaColor}); 
  return [
    arenaSideMaterialColor, // Left side
    arenaSideMaterialWhite, // Right side
    arenaSideMaterialWhite, // Top side
    arenaSideMaterialWhite, // Bottom side
    arenaSideMaterialWhite, // Front side
    arenaSideMaterialWhite  // Back side
  ]
}

function createCubeMaterial(type){
  var front
    , side = new THREE.MeshPhongMaterial({color:0xe5e4c6});

  if( type == 'video' ){
    front = new THREE.MeshBasicMaterial({color:0x000000}) 
  
  } else if( type == 'cpu' ){
    front = new THREE.ShaderMaterial({
      transparent: true,
      uniforms:  {
        time: { type: "f", value:0},
        resolution: { type: "v2", value:new THREE.Vector3(640,320)},
        mouse: { type: "v2", value:new THREE.Vector3(0.5,0.5)}
      },
      vertexShader: shaders.simple_vs,
      fragmentShader: shaders.cpu_fs
    })

  }

  return [
    side,   // Left side
    side,   // Right side
    side,   // Top side
    side,   // Bottom side
    front,  // Front side
    side    // Back side
  ]
}


function createTexture(element){
  var texture = new THREE.Texture(document.getElementById(element));
  texture.generateMipmaps = false;
  return new THREE.MeshLambertMaterial({map:texture})
}

function createShadow(){
  return new THREE.MeshBasicMaterial({
    depthWrite:false,
    transparent:true, 
    blending:THREE.MultiplyBlending, 
    depthTest: true, 
    map:THREE.ImageUtils.loadTexture("images/radial_gradient_white.png")
  })
}