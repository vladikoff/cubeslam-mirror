
var settings = require('../settings')
  , shaders = require('../shaders')
  , debug = require('debug')('renderer:3d:materials')

module.exports = new Materials();

function Materials(){
  debug('new')

  this.globalTimeUniform = { type: "f", value: 0 };
  this.paddle = new THREE.MeshLambertMaterial({shading: THREE.FlatShading, color: 0xedecd6})
  this.arenaSideFaces = new THREE.MeshFaceMaterial();
  this.centerLine = new THREE.MeshLambertMaterial({color:0xedecd6, side:THREE.DoubleSide})
  this.arenaTransMaterial = createArenaTransMaterial();
  this.staticNoise = createStaticNoiseMaterial()
  this.arenaBorder = new THREE.MeshLambertMaterial({color:0xedecd6})

  this.arenaSideColorMaterial = new THREE.MeshLambertMaterial({color:settings.theme.arenaColor});
  this.arenaSideMaterials = createArenaSideMaterials(this.arenaSideColorMaterial,this.arenaBorder);
  this.arenaGrid = createArenaGrid()
  this.reflectionBox = new THREE.MeshBasicMaterial({color:settings.theme.arenaColor, side:THREE.DoubleSide})
  this.playerACube = createCubeMaterial(this.arenaBorder)
  this.playerBCube = createCubeMaterial(this.arenaBorder)
  this.gradientPlane = createGradientPlane();


  this.localVideoTexture = createTexture("videoInput");
  this.remoteVideoTexture = createTexture("remoteInput");
  this.remoteVideo = new THREE.MeshLambertMaterial({map:this.remoteVideoTexture, side:THREE.DoubleSide})

  this.colorPreview = new THREE.MeshLambertMaterial({color:0x000000})
  this.emptyVideo = new THREE.MeshLambertMaterial({color:0x000000})
  this.localVideo = new THREE.MeshLambertMaterial({map:this.localVideoTexture, side:THREE.DoubleSide})
  this.cpu = createCPUMaterial();
  this.decal = createDecal()

  this.terrainShadow = createShadow()
  this.treeBranches = new THREE.MeshLambertMaterial({color:settings.theme.treeBranchColor,shading: THREE.FlatShading});

  this.terrain1 = new THREE.MeshLambertMaterial( {color:settings.theme.terrainColor1, shading:THREE.FlatShading });
  this.terrain2 = new THREE.MeshLambertMaterial( {color:settings.theme.terrainColor2, shading:THREE.FlatShading });
  this.terrain3 = new THREE.MeshLambertMaterial( {color:settings.theme.terrainColor3, shading:THREE.FlatShading });
  this.clouds = new THREE.MeshLambertMaterial({wireframe:false,shading:THREE.FlatShading,color:0xffffff});
  this.icon = createIconMaterial()
  this.iconReflection = createIconReflectionMaterial()
  this.iconCircle = createIconCircleMaterial()
  this.animal = createAnimalMaterial();

  this.obstacle = new THREE.MeshLambertMaterial({opacity:0.6, side:THREE.DoubleSide, color:settings.theme.puckColor });
  this.obstacle2 = createObstacleMaterial()
  this.puck = new THREE.MeshLambertMaterial( { color: settings.theme.puckColor })

  this.fog = createFog()

  this.updateColors = function(){

    this.reflectionBox.color.setHex( settings.theme.arenaColor );

    this.arenaTransMaterial.color.setHex( settings.theme.arenaColor );

    //var sideColor = new THREE.Color(settings.theme.arenaColor).getHSV();
    //sideColor.v *= 1.0;
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

    //this.treeTrunk.color.setHex( settings.theme.treeTrunkColor );

    updateGradientPlane( this.gradientPlane.map.image )
    this.gradientPlane.map.needsUpdate = true;

  }

  settings.on("colorsUpdated", this.updateColors.bind(this) )

  this.updateColors();

}

Materials.prototype.setMaxAnisotropy = function( value ) {
  this.iconCircle.map.anisotropy = value;
  this.arenaGrid.uniforms.tGrid.value.anisotropy = value;
  this.arenaGrid.uniforms.tDigits.value.anisotropy = value;
  this.cpu.map.anisotropy = value;
  this.animal.uniforms.map.value.anisotropy = value;
  this.decal.map.anisotropy = value;
  this.obstacle2.uniforms.tGrid.value.anisotropy = value;
  this.obstacle2.uniforms.tDigits.value.anisotropy = value;
}

Materials.prototype.update = function(world){

  var tex = this.remoteVideoTexture;
  if( tex && tex.image.readyState === tex.image.HAVE_ENOUGH_DATA ){
    tex.needsUpdate = true;
  }

  var tex = this.localVideoTexture;
  if( tex && tex.image.readyState === tex.image.HAVE_ENOUGH_DATA && world.paused){
    tex.needsUpdate = true;
  }

  // update arena score
  this.arenaGrid.uniforms.points.value.x = world.players.b.score;
  this.arenaGrid.uniforms.points.value.y = world.players.a.score;

// update obstacle score
  this.obstacle2.uniforms.points.value.x = world.players.b.score;
  this.obstacle2.uniforms.points.value.y = world.players.a.score;


  // update global shader time
  this.icon.uniforms.time.value += 0.03;
  this.iconReflection.uniforms.time.value += 0.03;
  this.staticNoise.uniforms.time.value += 0.01;
  this.fog.uniforms.time.value += 0.01;
}


function createArenaGrid(renderer){
  var gridTexture = THREE.ImageUtils.loadTexture( "images/grid.png" );
  gridTexture.mapping = THREE.UVMapping;
  //gridTexture.anisotropy = renderer.renderer.getMaxAnisotropy();
  gridTexture.minFilter = gridTexture.magFilter = THREE.LinearMipMapLinearFilter;
  gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;

  var digitsTexture = THREE.ImageUtils.loadTexture( "images/grid_nr4.png" );
  //gridTexture.anisotropy = renderer.renderer.getMaxAnisotropy();
  digitsTexture.minFilter = digitsTexture.magFilter = THREE.NearestFilter;
  digitsTexture.wrapS = digitsTexture.wrapT = THREE.RepeatWrapping;

  return new THREE.ShaderMaterial({
    depthWrite: false,
    transparent: true,
    //blending:THREE.AdditiveBlending,
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
  return [
    arenaSideMaterialColor, // Left side
    arenaSideMaterialWhite, // Right side
    arenaSideMaterialWhite, // Top side
    arenaSideMaterialWhite, // Bottom side
    arenaSideMaterialWhite, // Front side
    arenaSideMaterialWhite  // Back side
  ]
}

function createCubeMaterial( side ){

  return [
    side,   // Left side
    side,   // Right side
    side,   // Top side
    side,   // Bottom side
    createCPUMaterial(),  // Front side
    side    // Back side
  ]
}

function createCPUMaterial() {
  /*return new THREE.ShaderMaterial({
    transparent: false,
    side:THREE.DoubleSide,
    uniforms:  {
      time: { type: "f", value:0},
      resolution: { type: "v2", value:new THREE.Vector3(640,320)},
      mouse: { type: "v2", value:new THREE.Vector3(0.5,0.5)}
    },
    vertexShader: shaders.simple_vs,
    fragmentShader: shaders.cpu_fs
  })*/

    var texture = THREE.ImageUtils.loadTexture("images/cpu.jpg")
    texture.minFilter = texture.magFilter = THREE.LinearMipMapLinearFilter;
    texture.offset.y = 0.30
    texture.repeat.y = 0.70

    return new THREE.MeshLambertMaterial({color:0xe5e4c6,map:texture, side:THREE.DoubleSide})
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
        THREE.ShaderChunk[ "worldpos_vertex" ],
        THREE.ShaderChunk[ "lights_lambert_vertex" ],

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

      //THREE.ShaderChunk[ "lights_lambert_pars_vertex" ],
      //THREE.ShaderChunk[ "color_pars_vertex" ],

      "void main() {",

/*        THREE.ShaderChunk[ "color_vertex" ],
        THREE.ShaderChunk[ "defaultnormal_vertex" ],
        THREE.ShaderChunk[ "default_vertex" ],
        THREE.ShaderChunk[ "worldpos_vertex" ],
        THREE.ShaderChunk[ "lights_lambert_vertex" ],*/

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
  texture.premultiplyAlpha = false;

  texture.minFilter = texture.magFilter = THREE.LinearMipMapLinearFilter;
  texture.needsUpdate = true;

  return new THREE.MeshBasicMaterial({
    depthWrite:false,
    transparent:true,
    blending : THREE.AdditiveBlending,
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
  //texture.anisotropy = renderer.renderer.getMaxAnisotropy();
  texture.minFilter = texture.magFilter = THREE.LinearMipMapLinearFilter;

  return new THREE.MeshBasicMaterial({
    map:texture,
    lights:false,
    transparent:true,
    blending:THREE.MultiplyBlending})
}

function createFog() {
  //return new THREE.MeshLambertMaterial( { color: 0xffffff, transparent:true, opacity:0.1, depthWrite:true })

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
/*
        THREE.ShaderChunk[ "default_vertex" ],
        THREE.ShaderChunk[ "worldpos_vertex" ],
*/
        "float dist = distance(position, vec3(0.0));",
        "vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",
        "vWorldPosition = worldPosition.xyz;",

        "vec3 newPosition = position;",
        "newPosition.y *= amount*.75 +(sin(time*4.0+ dist/200.0)+1.0)*amount*0.1;",

        "gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition , 1.0 );",

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
  //gridTexture.anisotropy = renderer.renderer.getMaxAnisotropy();
  gridTexture.minFilter = gridTexture.magFilter = THREE.LinearMipMapLinearFilter;
  gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;

  var digitsTexture = THREE.ImageUtils.loadTexture( "images/grid_nr4.png" );
  //gridTexture.anisotropy = renderer.renderer.getMaxAnisotropy();
  digitsTexture.minFilter = digitsTexture.magFilter = THREE.NearestFilter;
  digitsTexture.wrapS = digitsTexture.wrapT = THREE.RepeatWrapping;

  return new THREE.ShaderMaterial({
    depthWrite: true,
    transparent: false,
    //blending:THREE.AdditiveBlending,
    uniforms: {
      points: { type: "v2", value: new THREE.Vector2(0,0)},
      tGrid: { type: "t", value: gridTexture},
      tDigits: { type: "t", value: digitsTexture},
      diffuse: { type: "c", value: new THREE.Color(0x000000).setHex(settings.theme.arenaColor) },
      resolution: { type:"v2", value: new THREE.Vector2(settings.data.arenaWidth,settings.data.arenaHeight)},
      scale: { type: "v2", value: new THREE.Vector2(settings.data.arenaColumns , 26 ) }
    },
    vertexShader: shaders.simple_vs,
    fragmentShader: shaders.obstacle_fs
  });
}

