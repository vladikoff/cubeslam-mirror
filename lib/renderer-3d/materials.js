
module.exports = Materials;

function Materials(renderer){
  this.obstacle = new THREE.MeshLambertMaterial({shading: THREE.FlatShading, color:0xffffff});
  this.paddle = new THREE.MeshLambertMaterial({shading: THREE.FlatShading, color:0xffffff});
  this.arenaSideFaces = new THREE.MeshFaceMaterial();
  this.centerLine = new THREE.MeshLambertMaterial({color:0xe5e4c6, side:THREE.DoubleSide})
  this.arenaSideMaterials = createArenaSideMaterials()
  this.arenaGrid = createArenaGrid(renderer)
  this.reflectionBox = new THREE.MeshBasicMaterial({color:0x000000, side:THREE.DoubleSide})
  this.videoCube = createCubeMaterial('video')
  this.cpuCube = createCubeMaterial('cpu',renderer)
  this.cubeFacesA = new THREE.MeshFaceMaterial();
  this.cubeFacesB = new THREE.MeshFaceMaterial();
  this.remoteVideo = createTexture('remoteInput')
  this.terrainShadow = createShadow()
  this.treeBranches = new THREE.MeshLambertMaterial({color:0x0e64bb,shading: THREE.FlatShading});
  this.treeTrunk = new THREE.MeshLambertMaterial({color:0x0c5ea7,shading: THREE.FlatShading})
}

Materials.prototype.update = function(){
  var tex = this.remoteVideo.map;
  if( tex && tex.image.readyState === tex.image.HAVE_ENOUGH_DATA )
    tex.needsUpdate = true;
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
    vertexShader: renderer.shaders.simple_vs,
    fragmentShader: renderer.shaders.arena_fs
  });
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

function createCubeMaterial(type, renderer){
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
      vertexShader: renderer.shaders.simple_vs,
      fragmentShader: renderer.shaders.cpu_fs
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