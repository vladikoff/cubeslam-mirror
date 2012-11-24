
var settings = require('../settings')
  , shaders = require('../shaders')
  , debug = require('debug')('renderer:3d:materials')

module.exports = Materials;

function Materials(renderer){
  debug('new')
  this.globalTimeUniform = { type: "f", value: 0 };
  this.paddle = new THREE.MeshPhongMaterial({shading: THREE.FlatShading, color:0xffffff});
  this.arenaSideFaces = new THREE.MeshFaceMaterial();
  this.centerLine = new THREE.MeshLambertMaterial({color:0xe5e4c6, side:THREE.DoubleSide})
  this.arenaTransMaterial = createArenaTransMaterial(renderer);
  this.arenaBorder = new THREE.MeshLambertMaterial({color:0xe5e4c6})
  this.arenaSideColorMaterial = new THREE.MeshPhongMaterial({color:settings.data.arenaColor});
  this.arenaSideMaterials = createArenaSideMaterials(this.arenaSideColorMaterial,this.arenaBorder);
  this.arenaGrid = createArenaGrid(renderer)
  this.reflectionBox = new THREE.MeshBasicMaterial({color:0x000000, side:THREE.DoubleSide})
  this.playerACube = createCubeMaterial()
  this.playerBCube = createCubeMaterial()
  this.gradientPlane = createGradientPlane();

  this.localVideoTexture = createTexture("videoInput");
  this.remoteVideoTexture = createTexture("remoteInput");
  this.remoteVideo = new THREE.MeshLambertMaterial({map:this.remoteVideoTexture, side:THREE.DoubleSide})
  this.paddleSetupBox = createPaddleSetupBox(this.localVideoTexture );
  this.paddleSetupFoundationBox = this.arenaSideColorMaterial;//new THREE.MeshLambertMaterial({color:0x000000})
  this.colorPreview = new THREE.MeshLambertMaterial({color:0x000000})
  this.emptyVideo = new THREE.MeshLambertMaterial({color:0x000000})
  this.localVideo = new THREE.MeshLambertMaterial({map:this.localVideoTexture, side:THREE.DoubleSide})
  this.cpu = createCPUMaterial();
  this.decal = createDecal(renderer)

  this.terrainShadow = createShadow()
  this.treeBranches = new THREE.MeshLambertMaterial({color:0x1d3bd1,shading: THREE.FlatShading});
  this.treeTrunk = new THREE.MeshLambertMaterial({color:0x0c5ea7,shading: THREE.FlatShading})
  this.icon = createIconMaterial(this.globalTimeUniform)
  this.iconCircle = createIconCircleMaterial(renderer)
  this.genericAnimal = createAnimalMaterial();


}

Materials.prototype.update = function(world){
  var tex = this.remoteVideoTexture;
  if( tex && tex.image.readyState === tex.image.HAVE_ENOUGH_DATA )
    tex.needsUpdate = true;

  // update arena score
  this.arenaGrid.uniforms.points.value.x = world.players.a.score % settings.data.maxHits;
  this.arenaGrid.uniforms.points.value.y = world.players.b.score % settings.data.maxHits;

  // update global shader time
  this.globalTimeUniform.value += 0.03;
  this.cpu.uniforms.time.value += 0.03;
  if (world.players.b.paddle) {
    this.cpu.uniforms.mouse.value.x = world.players.b.paddle.l + (world.players.b.paddle.r-world.players.b.paddle.l)*.5;
  }

  var paddleBoxUniforms = this.paddleSetupBox[4].uniforms;

  //noise
  if( paddleBoxUniforms.active.value == 0 ) {
    paddleBoxUniforms.time.value += 0.01;
  }
  //active
  else if( paddleBoxUniforms.active.value == 1){
    if( paddleBoxUniforms.time.value <= 1.1 ) {
      paddleBoxUniforms.time.value += 0.01;
    }
    else {
      paddleBoxUniforms.time.value = 1.8;
    }

    var tex = this.localVideoTexture;
    if( tex && tex.image.readyState === tex.image.HAVE_ENOUGH_DATA ){
      tex.needsUpdate = true;
    }

  }
  //nothing
  else if( paddleBoxUniforms.active.value == 2){
    paddleBoxUniforms.time.value = 1.8;

  }

  // update preview box color
  if( settings.data.trackingColor ){
    var c = settings.data.trackingColor;
    this.colorPreview.color.setRGB(c[0]/255,c[1]/255,c[2]/255);
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

  var digitsTexture = THREE.ImageUtils.loadTexture( "images/grid_nr3.png" );
  gridTexture.anisotropy = renderer.renderer.getMaxAnisotropy();
  digitsTexture.minFilter = digitsTexture.magFilter = THREE.LinearMipMapLinearFilter;

  return new THREE.ShaderMaterial({
    depthWrite: false,
    transparent: true,
    uniforms: {
      points: { type: "v2", value: new THREE.Vector2(0,0)},
      tGrid: { type: "t", value: gridTexture},
      tDigits: { type: "t", value: digitsTexture},

      //circlePosArray: {type: "v2v", value: getVec2Array(10)},
      resolution: { type:"v2", value: new THREE.Vector2(settings.data.arenaWidth,settings.data.arenaHeight)},
      scale: { type: "v2", value: new THREE.Vector2(settings.data.arenaColumns , 26 ) }
    },
    vertexShader: shaders.simple_vs,
    fragmentShader: shaders.arena_fs
  });
}

function getVec2Array(len){
  var arr = [];
  for (var i = len - 1; i >= 0; i--) {
    arr.push( new THREE.Vector2(0,0))
  };
  return arr;
}

function createArenaTransMaterial( renderer ){
  return new THREE.MeshLambertMaterial({
    color: settings.data.arenaColor,
    opacity:0.8,
    transparent:true,
    depthWrite:false,
   /* combine: THREE.MultiplyOperation,
    reflectivity: 0.15,
    envMap: renderer.skyboxCamera.renderTarget*/
  })
}

function createArenaSideMaterials(arenaSideMaterialColor,arenaSideMaterialWhite){
  return [
    arenaSideMaterialColor, // Left side
    arenaSideMaterialWhite, // Right side
    arenaSideMaterialWhite, // Top side
    arenaSideMaterialWhite, // Bottom side
    arenaSideMaterialWhite, // Front side
    arenaSideMaterialWhite  // Back side
  ]
}

function createCubeMaterial(){
  var front
    , side = new THREE.MeshLambertMaterial({color:0xe5e4c6})
    , front = new THREE.MeshLambertMaterial({color:0x000000,side:THREE.DoubleSide})
  return [
    side,   // Left side
    side,   // Right side
    side,   // Top side
    side,   // Bottom side
    front,  // Front side
    side    // Back side
  ]
}

function createCPUMaterial() {
  return new THREE.ShaderMaterial({
    transparent: false,
    side:THREE.DoubleSide,
    uniforms:  {
      time: { type: "f", value:0},
      resolution: { type: "v2", value:new THREE.Vector3(640,320)},
      mouse: { type: "v2", value:new THREE.Vector3(0.5,0.5)}
    },
    vertexShader: shaders.simple_vs,
    fragmentShader: shaders.cpu_fs
  })
}

function createPaddleSetupBox( localVideoTexture){
  var side = new THREE.MeshLambertMaterial({color:0x0e3d74});

  var camMat = new THREE.ShaderMaterial({
    uniforms:  {
      active: { type: "f", value:0},
      time: { type: "f", value:1.8},
      tCamera: {type:"t",value: localVideoTexture}
    },
    vertexShader: shaders.simple_vs,
    fragmentShader: shaders.scan_fs
  });


 // var camMat = new THREE.MeshLambertMaterial({color:0x0e3d74});
  return [
    side,   // Left side
    side,   // Right side
    side,   // Top side
    side,   // Bottom side
    camMat,  // Front side
    side    // Back side
  ]
}

function createTexture(element){
  var texture = new THREE.Texture(document.getElementById(element));
  texture.generateMipmaps = false;
  return texture;
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


function createIconMaterial(timeUniform){
  return new THREE.ShaderMaterial({
    transparent:false,
    uniforms:  {
      color: { type: "c", value: new THREE.Color('#ff0000') },
      time: timeUniform
    },
    vertexShader: shaders.extraicon_vs,
    fragmentShader: shaders.extraicon_fs,
    blending: THREE.AdditiveBlending,
    wireframe:false
  });
}

function createIconCircleMaterial( renderer ) {

  var circleCanvas = document.createElement("canvas")
  circleCanvas.width = 512;
  circleCanvas.height = 512;
  var context = circleCanvas.getContext("2d");
//  context.fillStyle = "#000000";
 // context.fillRect (0, 0, circleCanvas.width, circleCanvas.height);
 // context.globalCompositeMode = 'destination-in';
  context.lineWidth = 30;
  context.strokeStyle = "#e5e4c6";
  context.beginPath();
  context.arc(circleCanvas.width*.5, circleCanvas.height*.5, circleCanvas.width*.5-context.lineWidth*.5, Math.PI*2, 0, true);
  context.stroke();
  context.closePath();

  var texture = new THREE.Texture(circleCanvas);
  texture.premultiplyAlpha = true;
  texture.anisotropy = renderer.renderer.getMaxAnisotropy();
  texture.minFilter = texture.magFilter = THREE.LinearMipMapLinearFilter;
  texture.needsUpdate = true;

  return new THREE.MeshBasicMaterial({
    depthWrite:false,
    transparent:true,
    blending : THREE.CustomBlending,
    map:texture
  })
}

function createAnimalMaterial(){

  var animalTexture = THREE.ImageUtils.loadTexture("images/tex_animals.jpg");

  return new THREE.MeshLambertMaterial({
    map:animalTexture,
    ambient: 0x076fc8, specular: 0x222222, shininess: 20

  })
}

function createGradientPlane(){
  var canvas = document.createElement( 'canvas' );
  canvas.width = 128;
  canvas.height = 128;

  var context = canvas.getContext( '2d' );
  var gradient = context.createLinearGradient( 0, 0, 0 , canvas.height  );
  gradient.addColorStop( 0, 'rgba(0,0,0,0)' );
  gradient.addColorStop( 0.3, 'rgba(0,0,0,1)' );

  context.fillStyle = gradient;
  context.fillRect( 0, 0, canvas.width, canvas.height );

  var shadowTexture = new THREE.Texture( canvas );

  shadowTexture.needsUpdate = true;

  var shadowMaterial = new THREE.MeshBasicMaterial( { map: shadowTexture, transparent:false, side:THREE.DoubleSide} );

  return shadowMaterial;
}

function createDecal(renderer) {

  var texture = THREE.ImageUtils.loadTexture("images/playerbox_decals.jpg")
  texture.anisotropy = renderer.renderer.getMaxAnisotropy();
  texture.minFilter = texture.magFilter = THREE.LinearMipMapLinearFilter;

  return new THREE.MeshLambertMaterial({
    map:texture,
    transparent:true,
    blending:THREE.MultiplyBlending})
}
