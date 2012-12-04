
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
  this.reflectionBox = new THREE.MeshBasicMaterial({color:settings.data.arenaColor, side:THREE.DoubleSide})
  this.playerACube = createCubeMaterial()
  this.playerBCube = createCubeMaterial()
  this.gradientPlane = createGradientPlane();

  this.localVideoTexture = createTexture("videoInput");
  this.remoteVideoTexture = createTexture("remoteInput");
  this.remoteVideo = new THREE.MeshLambertMaterial({map:this.remoteVideoTexture, side:THREE.DoubleSide})
  this.paddleSetupBox = createPaddleSetupBox(this.localVideoTexture );
  this.paddleSetupFoundationBox = this.arenaSideColorMaterial;
  this.scanSymbols = createScanSymbolsMaterial(renderer)
  this.paddleSetupDecal = createScanDecalMaterial(renderer)
  this.colorPreview = new THREE.MeshLambertMaterial({color:0x000000})
  this.emptyVideo = new THREE.MeshLambertMaterial({color:0x000000})
  this.localVideo = new THREE.MeshLambertMaterial({map:this.localVideoTexture, side:THREE.DoubleSide})
  this.cpu = createCPUMaterial();
  this.decal = createDecal(renderer)

  this.terrainShadow = createShadow()
  this.treeBranches = new THREE.MeshLambertMaterial({color:0x1564a4,shading: THREE.SmoothShading});
  this.treeTrunk = new THREE.MeshLambertMaterial({color:0x0c5ea7,shading: THREE.FlatShading})
  this.icon = createIconMaterial()
  this.iconCircle = createIconCircleMaterial(renderer)
  this.animal = createAnimalMaterial();


}

Materials.prototype.update = function(world){

  var tex = this.remoteVideoTexture;
  if( tex && tex.image.readyState === tex.image.HAVE_ENOUGH_DATA )
    tex.needsUpdate = true;

  // update arena score
  this.arenaGrid.uniforms.points.value.x = world.players.a.score % settings.data.maxHits;
  this.arenaGrid.uniforms.points.value.y = world.players.b.score % settings.data.maxHits;

  // update global shader time

  this.icon.uniforms.time.value += 0.03;
  this.cpu.uniforms.time.value += 0.03;

  if(world.opponent) {
    var paddle = world.paddles[world.opponent.paddle];
    if (paddle) {
      this.cpu.uniforms.mouse.value.x = paddle.x;// + (paddle.r-paddle.l)*.5;
    }
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
  var c = settings.data.trackingColorPreview;
  if( c ){
    this.colorPreview.color.setRGB(c[0]/255,c[1]/255,c[2]/255);
  }

  // arena colors
  // TODO move this to level change or settings change
  if( this.arenaTransMaterial.color.getHex() != settings.data.arenaColor) {
    this.reflectionBox.color.setHex( settings.data.arenaColor );
    this.arenaTransMaterial.color.setHex( settings.data.arenaColor );
    this.arenaSideMaterials[0].color.setHex( settings.data.arenaColor );
    updateGradientPlane( this.gradientPlane.map.image )
    this.gradientPlane.map.needsUpdate = true; 
  }
}


function createArenaGrid(renderer){
  var gridTexture = THREE.ImageUtils.loadTexture( "images/grid.png" );
  gridTexture.mapping = THREE.UVMapping;
  //gridTexture.anisotropy = renderer.renderer.getMaxAnisotropy();
  gridTexture.minFilter = gridTexture.magFilter = THREE.LinearMipMapLinearFilter;
  gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;

  var digitsTexture = THREE.ImageUtils.loadTexture( "images/grid_nr3.png" );
  //gridTexture.anisotropy = renderer.renderer.getMaxAnisotropy();
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
    depthWrite:false
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

function createScanSymbolsMaterial(renderer) {

  var texture = THREE.ImageUtils.loadTexture("images/scan_symbols.jpg")
  texture.anisotropy = renderer.renderer.getMaxAnisotropy();
  texture.minFilter = texture.magFilter = THREE.LinearMipMapLinearFilter;

  return new THREE.MeshBasicMaterial({
    opacity:0,
    depthWrite:false,
    transparent:true,
    blending:THREE.AdditiveBlending,
    depthTest: true,
    map:texture
  })
}

function createScanDecalMaterial(renderer) {

  var texture = THREE.ImageUtils.loadTexture("images/scan_symbols.jpg")
  texture.anisotropy = renderer.renderer.getMaxAnisotropy();
  texture.minFilter = texture.magFilter = THREE.LinearMipMapLinearFilter;

  return new THREE.MeshBasicMaterial({
    opacity:1,
    depthWrite:false,
    transparent:true,
    blending:THREE.AdditiveBlending,
    depthTest: true,
    map:texture
  })
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


function createIconMaterial(){
  return new THREE.ShaderMaterial({
    transparent:true,

    uniforms:  THREE.UniformsUtils.merge( [

      THREE.UniformsLib[ "common" ],
      THREE.UniformsLib[ "lights" ],

      {
        "ambient"  : { type: "c", value: new THREE.Color( 0x444444 ) },
        "emissive" : { type: "c", value: new THREE.Color( 0x000000 ) },
        "wrapRGB"  : { type: "v3", value: new THREE.Vector3( 0, 0, 1 ) },
        "diffuse": { type: "c", value: new THREE.Color(0xff0000) },
        "opacity": { type: "f", value: 0.8 },
        "time":  { type: "f", value: 0 }
      }

    ] ),
    vertexShader: [

      "#define LAMBERT",

      "varying vec3 vLightFront;",
      "varying vec3 vWorldPosition;",
      "uniform float time;",
      "#ifdef DOUBLE_SIDED",
        "varying vec3 vLightBack;",
      "#endif",

      THREE.ShaderChunk[ "lights_lambert_pars_vertex" ],
      THREE.ShaderChunk[ "color_pars_vertex" ],

      "void main() {",

        THREE.ShaderChunk[ "color_vertex" ],
        THREE.ShaderChunk[ "defaultnormal_vertex" ],
        THREE.ShaderChunk[ "default_vertex" ],
        THREE.ShaderChunk[ "worldpos_vertex" ],
        THREE.ShaderChunk[ "lights_lambert_vertex" ],

        "vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",
        "vWorldPosition = worldPosition.xyz;",

        "vec3 newPosition = position;",
        "newPosition.y += sin(time*5.0)*5.0;",

        "float Angle = sin(time);",

        "mat4 RotationMatrix = mat4(",
                "cos( Angle ),  0.0, -sin( Angle ), 0.0,",
                "0.0,  1, 0.0, 0.0,",
                "sin( Angle ), 0.0, cos( Angle ), 0.0,",
                "0.0, 0.0, 0.0, 1.0 );",

        "gl_Position = projectionMatrix * modelViewMatrix * RotationMatrix* vec4( newPosition , 1.0 );",

      "}"

    ].join("\n"),
    fragmentShader: [
      "uniform float opacity;",

      "varying vec3 vLightFront;",
      "varying vec3 vWorldPosition;",

      "#ifdef DOUBLE_SIDED",

        "varying vec3 vLightBack;",

      "#endif",

      THREE.ShaderChunk[ "color_pars_fragment" ],
      THREE.ShaderChunk[ "map_pars_fragment" ],

      "void main() {",

        "gl_FragColor = vec4( vec3 ( 1.0 ), (opacity-0.5)+0.5*step(-200.0,vWorldPosition.y) );",

        "#ifdef DOUBLE_SIDED",

           "if ( gl_FrontFacing )",
            "gl_FragColor.xyz *= vLightFront;",
          "else",
            "gl_FragColor.xyz *= vLightBack;",

        "#else",

          "gl_FragColor.xyz *= vLightFront;",

        "#endif",

        THREE.ShaderChunk[ "color_fragment" ],

        THREE.ShaderChunk[ "linear_to_gamma_fragment" ],


      "}"

    ].join("\n"),
    //blending: THREE.AdditiveBlending,
    wireframe:false,
    lights:true
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

  var texture = THREE.ImageUtils.loadTexture( "images/animals_texture_10.jpg" );
    
    texture.minFilter = texture.magFilter = THREE.LinearMipMapLinearFilter;
    texture.flipY = false;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    
    var lambertShader = THREE.ShaderLib['lambert'];
    var uniforms = THREE.UniformsUtils.clone(lambertShader.uniforms);

    uniforms.map.value = texture;
    uniforms.diffuse.value = new THREE.Color(0x000000).setRGB(81/255,72/255,66/255);
    uniforms.ambient.value = new THREE.Color(0x4d87dc);

    var shaderMat =  new THREE.ShaderMaterial({
        morphTargets:true,
        lights:true,

        uniforms: uniforms,
        vertexShader: [

          "#define LAMBERT",
          "varying vec3 vLightFront;",
        THREE.ShaderChunk[ "map_pars_vertex" ],
        THREE.ShaderChunk[ "lights_lambert_pars_vertex" ],
        THREE.ShaderChunk[ "color_pars_vertex" ],
        THREE.ShaderChunk[ "morphtarget_pars_vertex" ],

        "void main() {",
          THREE.ShaderChunk[ "map_vertex" ],
          THREE.ShaderChunk[ "defaultnormal_vertex" ],
          THREE.ShaderChunk[ "morphtarget_vertex" ],
          THREE.ShaderChunk[ "default_vertex" ],
          THREE.ShaderChunk[ "worldpos_vertex" ],
          //THREE.ShaderChunk[ "lights_lambert_vertex" ],
        "}"

        ].join("\n"),
        fragmentShader: [
          "varying vec3 vLightFront;",           
          "uniform vec3 ambient;",
          "uniform vec3 diffuse;",

      THREE.ShaderChunk[ "map_pars_fragment" ],
      THREE.ShaderChunk[ "fog_pars_fragment" ],

          "void main() {",

            "gl_FragColor = vec4(1.0);",
            
            THREE.ShaderChunk[ "color_fragment" ],

        "vec4 texelColor = texture2D( map, vUv );",
        "vec3 bodyColor = (diffuse*texelColor.r*0.3+(texelColor.g*ambient*0.6));",
        "gl_FragColor = vec4( bodyColor + vec3(step(0.9,texelColor.b))*bodyColor*8.0,1.0);",
        
        THREE.ShaderChunk[ "linear_to_gamma_fragment" ],
        THREE.ShaderChunk[ "fog_fragment" ],

          "}"

        ].join("\n")
      });

    shaderMat.map = true;

    return shaderMat;
}

function createGradientPlane(){
  var canvas = document.createElement( 'canvas' );
  canvas.width = 128;
  canvas.height = 128;

  updateGradientPlane(canvas);
  
  var shadowTexture = new THREE.Texture( canvas );
  shadowTexture.needsUpdate = true;

  var shadowMaterial = new THREE.MeshBasicMaterial( { map: shadowTexture, transparent:false, side:THREE.DoubleSide} );

  return shadowMaterial;
}

function updateGradientPlane( canvas ) {
  var context = canvas.getContext( '2d' );
  var gradient = context.createLinearGradient( 0, 0, 0 , canvas.height);
  var r = dat.color.math.component_from_hex(settings.data.arenaColor,2);
  var g = dat.color.math.component_from_hex(settings.data.arenaColor,1);
  var b = dat.color.math.component_from_hex(settings.data.arenaColor,0); 
  
  gradient.addColorStop( 0, 'rgba('+r+','+g+','+b+',0)' );
  gradient.addColorStop( 0.3, 'rgba('+r+','+g+','+b+',1)' );

  context.fillStyle = gradient;
  context.fillRect( 0, 0, canvas.width, canvas.height );

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
