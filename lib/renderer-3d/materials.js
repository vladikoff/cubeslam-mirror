var debug = require('debug')('renderer:3d:materials')
  , settings = require('../settings')
  , shaders = require('../shaders')

module.exports = new Materials();

function Materials(){
  debug('new')

  this.showLocalVideo = false;

  this.globalTimeUniform = { type: "f", value: 0 };
  this.overlay = createOverlayMaterial()

  this.paddle = new THREE.MeshLambertMaterial({shading: THREE.FlatShading, color: 0xedecd6})
 // this.arenaSideFaces = new THREE.MeshFaceMaterial();
  this.centerLine = new THREE.MeshLambertMaterial({color:0xedecd6, side:THREE.DoubleSide})
  this.arenaTransMaterial = createArenaTransMaterial();
  this.staticNoise = createStaticNoiseMaterial()
  this.arenaBorder = new THREE.MeshLambertMaterial({color:0xedecd6})


  //this.remoteVideo = new THREE.MeshLambertMaterial({map:this.remoteVideoTexture, side:THREE.DoubleSide})
  this.opponent = createOpponentMaterial();
  this.me = createMeMaterial();

  this.arenaSideColorMaterial = new THREE.MeshLambertMaterial({color:settings.theme.arenaColor});
  this.arenaSideMaterials = createArenaSideMaterials(this.arenaSideColorMaterial,this.arenaBorder);
  this.arenaGrid = createArenaGrid()
  this.digitsPlayer1 = createDigitsMaterial();
  this.digitsPlayer2 = createDigitsMaterial();
  this.reflectionBox = new THREE.MeshBasicMaterial({color:settings.theme.arenaColor, side:THREE.DoubleSide});
  this.playerACube = createCubeMaterial(this.arenaBorder,this.me)
  this.playerBCube = createCubeMaterial(this.arenaBorder,this.opponent)
  this.gradientPlane = createGradientPlane();

  this.remoteVideoTexture = createTexture("remoteInput");


  this.colorPreview = new THREE.MeshLambertMaterial({color:0x000000})
  this.emptyVideo = new THREE.MeshLambertMaterial({color:0x000000})

  this.decal = createDecal()
  this.shield = new THREE.MeshLambertMaterial( {color:0xffffff,transparent:true, opacity:0.2,side:THREE.DoubleSide} );

  this.terrainShadow = createShadow()
  this.treeBranches = new THREE.MeshLambertMaterial({color:settings.theme.treeBranchColor,shading: THREE.FlatShading});

  this.terrain1 = new THREE.MeshLambertMaterial( {color:settings.theme.terrainColor1, shading:THREE.FlatShading });
  this.terrain2 = new THREE.MeshLambertMaterial( {color:settings.theme.terrainColor2, shading:THREE.FlatShading });
  this.terrain3 = new THREE.MeshLambertMaterial( {color:settings.theme.terrainColor3, shading:THREE.FlatShading });
  this.clouds = new THREE.MeshLambertMaterial({wireframe:false,shading:THREE.FlatShading,color:0xffffff});
  this.icon = createIconMaterial()
  this.iconReflection = createIconReflectionMaterial()
  //this.iconCircle = createIconCircleMaterial()
  this.animal = createAnimalMaterial();

  this.obstacle = new THREE.MeshLambertMaterial({opacity:0.6, side:THREE.DoubleSide, color:settings.theme.puckColor });
  this.obstacle2 = createObstacleMaterial()
  this.obstacleSide = createObstacleSideMaterial()
  this.puck = new THREE.MeshLambertMaterial( { color: settings.theme.puckColor })

  //extras
  this.fire = new THREE.MeshLambertMaterial( {color:new THREE.Color(settings.data.fireColor), transparent:true, opacity:0.5, side:THREE.DoubleSide});
  this.fireReflection = new THREE.MeshLambertMaterial( {color:new THREE.Color(settings.data.fireColor), transparent:true,opacity:0.03,blending:THREE.AdditiveBlending });
  this.ghost = new THREE.MeshLambertMaterial( {color:0xffffff, transparent:true, opacity:1, side:THREE.DoubleSide});
  this.fog = createFog()



  this.updateColors = function(){

    this.reflectionBox.color.setHex( settings.theme.arenaColor );

    this.arenaTransMaterial.color.setHex( settings.theme.arenaColor );

    this.arenaSideColorMaterial.color.setHex(settings.theme.arenaColor);//color = new THREE.Color().setHSV(sideColor.h,sideColor.s,sideColor.v);

    this.terrain1.color.setHex( settings.theme.terrainColor1 );
    this.terrain2.color.setHex( settings.theme.terrainColor2 );
    this.terrain3.color.setHex( settings.theme.terrainColor3 );
    this.treeBranches.color.setHex( settings.theme.treeBranchColor );
    this.icon.uniforms.diffuse.value.setHex( settings.theme.iconColor );
    this.obstacle.color.setHex( settings.theme.puckColor );
    this.iconReflection.uniforms.diffuse.value.setHex( settings.theme.iconColor );
    this.animal.uniforms.ambient.value.setHex( settings.theme.terrainColor1 );

    this.obstacle2.uniforms.diffuse.value.setHex(settings.theme.arenaColor);

    updateGradientPlane( this.gradientPlane.map.image )
    this.gradientPlane.map.needsUpdate = true;

  }

  settings.on("colorsUpdated", this.updateColors.bind(this) )

  this.updateColors();

}

Materials.prototype.setMaxAnisotropy = function( value ) {
 // this.iconCircle.map.anisotropy = value;
  this.arenaGrid.uniforms.tGrid.value.anisotropy = value;
  this.animal.uniforms.map.value.anisotropy = value;
  this.decal.map.anisotropy = value;
  this.digitsPlayer1.map.anisotropy = value;
  this.digitsPlayer2.map.anisotropy = value;
  this.obstacle2.uniforms.tGrid.value.anisotropy = value;
  //this.obstacle2.uniforms.tDigits.value.anisotropy = value;

  //this.shield.materials.[4].uniforms.tDecal.value.anisotropy = value;
}

Materials.prototype.update = function(world){

  var tex = this.remoteVideoTexture;
  if(  tex && tex.image.readyState === tex.image.HAVE_ENOUGH_DATA ){
    tex.needsUpdate = true;
  }

  var tex = this.me.uniforms.tVideo.value;
  if( this.showLocalVideo && tex.image && tex.image.readyState === tex.image.HAVE_ENOUGH_DATA ){
    tex.needsUpdate = true;
  }

  this.digitsPlayer1.map.offset.x = 1/10*world.players.a.score;
  this.digitsPlayer2.map.offset.x = 1/10*world.players.b.score;

  // update global shader time
  this.icon.uniforms.time.value += 0.03;
  this.opponent.uniforms.time.value += 0.1;
  this.me.uniforms.time.value += 0.1;
  this.iconReflection.uniforms.time.value += 0.03;
  this.staticNoise.uniforms.time.value += 0.01;
  this.fog.uniforms.time.value += 0.01;

  this.fire.color.value = Math.random()*0xff0000;
}


Materials.prototype.updateScreenSize = function(w,h) {
  this.overlay.uniforms.resolution.value = new THREE.Vector2( w, h );
}

function createArenaGrid(renderer){
  var gridTexture = THREE.ImageUtils.loadTexture( "images/grid.png" );
  gridTexture.mapping = THREE.UVMapping;
  gridTexture.minFilter = THREE.LinearMipMapLinearFilter;
  gridTexture.magFilter = THREE.LinearFilter;
  gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;

  return new THREE.ShaderMaterial({
    depthWrite: false,
    transparent: true,
    uniforms: {
      tGrid: { type: "t", value: gridTexture},
      resolution: { type:"v2", value: new THREE.Vector2(settings.data.arenaWidth,settings.data.arenaHeight*.5)},
      scale: { type: "v2", value: new THREE.Vector2(settings.data.arenaColumns ,settings.data.arenaRows ) }
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

function createStaticNoiseMaterial() {

  return new THREE.ShaderMaterial({
    uniforms:  {
      time: { type: "f", value:0.1}
    },
    vertexShader: shaders.simple_vs,
    fragmentShader: shaders.static_fs,
    side:THREE.DoubleSide
  });
}

function createArenaTransMaterial( renderer ){
  return new THREE.MeshLambertMaterial({
    color: settings.theme.arenaColor,
    opacity:0.8,
    transparent:true,
    depthWrite:false
  })
}

function createArenaSideMaterials(arenaSideMaterialColor,arenaSideMaterialWhite){
  return new THREE.MeshFaceMaterial( [
    arenaSideMaterialColor, // Left side
    arenaSideMaterialWhite, // Right side
    arenaSideMaterialWhite, // Top side
    arenaSideMaterialWhite, // Bottom side
    arenaSideMaterialWhite, // Front side
    arenaSideMaterialWhite  // Back side
  ])
}

function createCubeMaterial( side,opponent ){

 return new THREE.MeshFaceMaterial( [
    side,   // Left side
    side,   // Right side
    side,   // Top side
    side,   // Bottom side
    opponent,  // Front side
    side    // Back side
   ])
}

function createOpponentMaterial() {
  var canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  var ctx = canvas.getContext("2d");
  ctx.fillStyle =  "rgba(255, 255, 255, 1)";
  ctx.fillRect(0,0, 512, 512);

  var brokenTexture = new THREE.Texture( canvas );

  var uniforms = {
    time:  { type: "f", value: 1.0 },
    noiseAmount:  { type: "f", value: 0 },
    tVideo: { type: "t", value: brokenTexture  },
    tBroken: { type: "t", value: brokenTexture },
    resolution: { type:"v2", value: new THREE.Vector2(512,360)}

  };

  var mat = new THREE.ShaderMaterial({
    wireframe:false,
    transparent:false,
    uniforms:   uniforms,
    vertexShader:   shaders.simple_vs,
    fragmentShader: shaders.video_fs
  });

  //TODO: Save broken info in video alpha channel.

  //save shortcut
  mat.brokenTextureCtx = ctx;

  return mat;

}


function createMeMaterial() {

  var texture = new THREE.Texture(document.getElementById("localInput"));
  texture.generateMipmaps = false;

  var uniforms = {
    time:  { type: "f", value: 1.0 },
    noiseAmount:  { type: "f", value: 1 },
    tVideo: { type: "t", value: texture  }

  };

  var mat = new THREE.ShaderMaterial({
    wireframe:false,
    uniforms:   uniforms,
    vertexShader:   shaders.simple_vs,
    fragmentShader: shaders.localvideo_fs
  });

  return mat;
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
        "diffuse": { type: "c", value: new THREE.Color(settings.theme.iconColor) },
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

        THREE.ShaderChunk[ "lights_lambert_vertex" ],

        "vec4 myWorldPosition = modelMatrix * vec4( position, 1.0 );",
        "vWorldPosition = myWorldPosition.xyz;",

        "vec3 newPosition = position;",
        "newPosition.y += sin(time*5.0)*10.0;",

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
    wireframe:false,
    lights:true
  });
}

function createIconReflectionMaterial(){
  return new THREE.ShaderMaterial({
    transparent:false,

    uniforms:  THREE.UniformsUtils.merge( [

      THREE.UniformsLib[ "common" ],
      {
        "diffuse": { type: "c", value: new THREE.Color(settings.theme.iconColor)},
        "opacity": { type: "f", value: 1 },
        "time":  { type: "f", value: 0 }
      }

    ] ),
    vertexShader: [

      "varying vec3 vWorldPosition;",
      "uniform float time;",
      "uniform vec3 diffuse;",

      "void main() {",
        "vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",
        "vWorldPosition = worldPosition.xyz;",
        "vec3 newPosition = position;",
        "newPosition.y += sin(time*5.0)*10.0;",

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

      "varying vec3 vWorldPosition;",
      "uniform vec3 diffuse;",

      "void main() {",
        "gl_FragColor = vec4(diffuse, 1.0-vWorldPosition.y/-300.0);",

      "}"

    ].join("\n"),
    wireframe:false,
    transparent:true,
    side:THREE.FrontSide,
    lights:false
  });
}
/*
function createIconCircleMaterial( renderer ) {

  var circleCanvas = document.createElement("canvas")
  circleCanvas.width = 512;
  circleCanvas.height = 512;
  var context = circleCanvas.getContext("2d");

  context.lineWidth = 30;
  context.strokeStyle = "#e5e4c6";
  context.beginPath();
  context.arc(circleCanvas.width*.5, circleCanvas.height*.5, circleCanvas.width*.5-context.lineWidth*.5, Math.PI*2, 0, true);
  context.stroke();
  context.closePath();

  var texture = new THREE.Texture(circleCanvas);
  texture.premultiplyAlpha = false;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  return new THREE.MeshBasicMaterial({
    depthWrite:false,
    transparent:true,
    blending : THREE.AdditiveBlending,
    map:texture
  })
}
*/

function createAnimalMaterial(){

  var texture = THREE.ImageUtils.loadTexture( "images/animals_texture_10.jpg" );
  texture.flipY = false;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;

  var uniforms = {

    ambient:  { type: "c", value: new THREE.Color(0x4d87dc) },
    diffuse:  { type: "c", value: new THREE.Color(0x000000).setRGB(81/255,72/255,66/255) },
    map: { type: "t", value: texture  }

  };

  var shaderMat =  new THREE.ShaderMaterial({
      morphTargets:true,
      uniforms: uniforms,
      vertexShader:shaders.animal_vs,
      fragmentShader: shaders.animal_fs
    });

  return shaderMat;
}

function createGradientPlane(){
  var canvas = document.createElement( 'canvas' );
  canvas.width = 128;
  canvas.height = 128;

  updateGradientPlane(canvas);

  var shadowTexture = new THREE.Texture( canvas );
  shadowTexture.needsUpdate = true;

  var shadowMaterial = new THREE.MeshBasicMaterial( { map: shadowTexture, transparent:false,depthWrite:true, side:THREE.DoubleSide} );

  return shadowMaterial;
}

function updateGradientPlane( canvas ) {
  var context = canvas.getContext( '2d' );
  var gradient = context.createLinearGradient( 0, 0, 0 , canvas.height);
  var r = dat.color.math.component_from_hex(settings.theme.arenaColor,2);
  var g = dat.color.math.component_from_hex(settings.theme.arenaColor,1);
  var b = dat.color.math.component_from_hex(settings.theme.arenaColor,0);

  gradient.addColorStop( 0, 'rgba('+r+','+g+','+b+',0)' );
  gradient.addColorStop( 0.3, 'rgba('+r+','+g+','+b+',1)' );

  context.fillStyle = gradient;
  context.fillRect( 0, 0, canvas.width, canvas.height );

}

function createDecal(renderer) {

  var texture = THREE.ImageUtils.loadTexture("images/playerbox_decals2.jpg")
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return new THREE.MeshBasicMaterial({
    map:texture,
    lights:false,
    transparent:true,
    blending:THREE.MultiplyBlending})
}

function createFog() {

  return new THREE.ShaderMaterial({
    transparent:true,
    uniforms:  THREE.UniformsUtils.merge( [
      {
        "diffuse": { type: "c", value: new THREE.Color(0xffffff) },
        "time":  { type: "f", value: 0 },
        "amount":  { type: "f", value: -0.1 },
      }

    ] ),
    vertexShader: [

      "varying vec3 vWorldPosition;",
      "uniform float time;",
      "uniform float amount;",

      "void main() {",

        "float dist = distance(position, vec3(0.0));",
        "vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",
        "vWorldPosition = worldPosition.xyz;",

        //wave animation
        //"vec3 newPosition = position;",
        //"newPosition.y *= amount*.75 +(sin(time*4.0+ dist/200.0)+1.0)*amount*0.1;",

        "gl_Position = projectionMatrix * modelViewMatrix * vec4( position , 1.0 );",

      "}"

    ].join("\n"),
    fragmentShader: [

      "varying vec3 vWorldPosition;",
      "uniform float amount;",

      "void main() {",
        "gl_FragColor = vec4( vec3 ( 0.8 ), 0.2*amount );",
      "}"

    ].join("\n"),
    wireframe:false,
    lights:false,
    side:THREE.DoubleSide
  });

}

function createObstacleMaterial(renderer) {

  var gridTexture = THREE.ImageUtils.loadTexture( "images/grid.png" );
  gridTexture.mapping = THREE.UVMapping;
  gridTexture.minFilter = THREE.LinearMipMapLinearFilter;
  gridTexture.magFilter = THREE.LinearFilter;
  gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;

  return new THREE.ShaderMaterial({
    transparent: false,
    uniforms: {
      tGrid: { type: "t", value: gridTexture},
      diffuse: { type: "c", value: new THREE.Color(0x000000).setHex(settings.theme.arenaColor) },
      resolution: { type:"v2", value: new THREE.Vector2(settings.data.arenaWidth,settings.data.arenaHeight)},
      scale: { type: "v2", value: new THREE.Vector2(settings.data.arenaColumns , 26 ) }
    },
    vertexShader: shaders.nano_vs,
    fragmentShader: shaders.obstacle_fs
  });

}

function createObstacleSideMaterial(renderer) {

  var canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  var ctx = canvas.getContext("2d");
  ctx.fillStyle =  "rgba(255, 255, 255, 0)";
  ctx.fillRect(0,0, 8, 8);

  return new THREE.ShaderMaterial({
    transparent: false,
    uniforms: {
      tGrid: { type: "t", value: canvas},
      diffuse: { type: "c", value: new THREE.Color(0xedecd6)},
      resolution: { type:"v2", value: new THREE.Vector2(settings.data.arenaWidth,settings.data.arenaHeight)},
      scale: { type: "v2", value: new THREE.Vector2(settings.data.arenaColumns , 26 ) }
    },
    vertexShader: shaders.simple_vs,
    fragmentShader: shaders.obstacle_fs
  });

}

function createOverlayMaterial() {

  var tapeTexture = THREE.ImageUtils.loadTexture( "images/tape_overlay.jpg" );
  tapeTexture.mapping = THREE.UVMapping;
  tapeTexture.minFilter = THREE.LinearFilter;
  tapeTexture.magFilter = THREE.LinearFilter;
  var uniforms = {
    resolution: { type: "v2", value: new THREE.Vector2(window.innerWidth,window.innerHeight) },
    tTape: { type: "t", value: tapeTexture}
  };

  return new THREE.ShaderMaterial( {
    blending:THREE.MultiplyBlending,
    transparent:true,
    depthWrite:false,
    uniforms: uniforms,
    vertexShader: shaders.simple_vs,
    fragmentShader: shaders.overlay_fs
  } );
}
/*
function createShield() {
 var semiTrans1 = new THREE.MeshBasicMaterial({color:0xffffff,transparent:true, opacity:0.6});

  var decalTexture = THREE.ImageUtils.loadTexture( "images/shield_decal.png" );
  decalTexture.minFilter = THREE.LinearMipMapLinearFilter;
  decalTexture.magFilter = THREE.LinearFilter;

  var semiTrans2 = new THREE.ShaderMaterial({
    side:THREE.DoubleSide,
    transparent: true,
    uniforms: {
      uBrightness:  { type: "f", value: 0 },
      uColor: { type: "c", value: new THREE.Color( settings.theme.shieldColor ) }
      //tDecal: { type: "t", value: decalTexture}
    },
    vertexShader: shaders.simple_vs,
    fragmentShader: shaders.shield_fs
  })

  return new THREE.MeshFaceMaterial([
    semiTrans1,
    semiTrans1,
    semiTrans1,
    semiTrans1,
    semiTrans2,
    semiTrans2
  ])

  //return new THREE.MeshLambertMaterial( {transparent:true,opacity:0.3,color:0xffffff} );

}
*/

function createDigitsMaterial(){

  var texture = THREE.ImageUtils.loadTexture( "images/grid_nr7.png" );
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearFilter;
  //texture.minFilter = THREE.NearestMipMapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  //texture.magFilter = THREE.NearestMipMapLinearFilter;


  texture.repeat = new THREE.Vector2(0.099,0.178);
  texture.offset = new THREE.Vector2(0,0.822);

  return new THREE.MeshBasicMaterial( {
    transparent:true,
    opacity:0.9,
    blending:THREE.AdditiveBlending,
    map:texture
  } );
}

