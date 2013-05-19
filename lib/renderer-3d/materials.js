var Emitter = require('emitter')
  , debug = require('debug')('renderer:3d:materials')
  , settings = require('../settings')
  , Themes = require('../themes')
  , shaders = require('./shaders')

var materials =  Emitter(new Materials());

module.exports = materials;

var pending = 2;

materials.PIXEL_FORMAT_RGB = 'rbg';
materials.PIXEL_FORMAT_BGR = 'bgr';

function Materials(){
  debug('new')

  this.showLocalVideo = false;

  this.overlay = createOverlayMaterial()
  this.overlayNoise = createOverlayNoiseMaterial()
  this.overlayMirror = createOverlayMirrorMaterial()

  this.paddle = new THREE.MeshLambertMaterial({shading: THREE.FlatShading, color: Themes.white})
  this.resizeSkin = new THREE.MeshBasicMaterial( { color: Themes.white, wireframe:true });

  this.centerLine = createCenterLineMaterial()
  this.arenaBorder = new THREE.MeshLambertMaterial({color:Themes.white})

  this.opponent = createOpponentMaterial();
  this.me = createMeMaterial();
  this.cpuBackdrop = new THREE.MeshLambertMaterial({color:new THREE.Color(settings.theme.cpuBackdropColor)});

  this.arenaSideColorMaterial = new THREE.MeshLambertMaterial({color:new THREE.Color(settings.theme.arenaColor)});
  this.arenaSideMaterials = createArenaSideMaterials(this.arenaSideColorMaterial,this.arenaBorder);
  this.arenaGrid = createArenaGrid()
  this.digitsPlayer1 = createDigitsMaterial();
  this.digitsPlayer2 = createDigitsMaterial();
  this.reflectionBox = new THREE.MeshBasicMaterial({color:settings.theme.arenaColor, side:THREE.DoubleSide});

  this.playerACube = createCubeMaterial(this.arenaBorder,this.me)
  this.playerBCube = createCubeMaterial(this.arenaBorder,this.opponent)

  this.remoteVideoTexture = createTexture('remoteInput');
  this.remoteVideoTexture.generateMipmaps = false;
  this.remoteVideoTexture.format = THREE.RGBFormat;
  /*this.remoteVideoDownscaledCanvas = createRemoteVideoDownscaledCanvas()
  this.remoteVideoDownscaledTexture = createTexture(this.remoteVideoDownscaledCanvas);
  this.remoteVideoDownscaledTexture.generateMipmaps = false;*/
  this.decal1 = createDecal()
  this.decal2 = createDecal()
  this.screenDecal1 = createScreenDecal()
  this.screenDecal2 = createScreenDecal()
  this.shield = new THREE.MeshLambertMaterial( {color:new THREE.Color(settings.data.shieldColor),transparent:true, opacity:0.2,side:THREE.DoubleSide} );

  this.terrainShadow = createShadow( textureLoadedCallback )
  this.treeBranches = new THREE.MeshLambertMaterial({color:settings.theme.treeBranchColor,shading: THREE.FlatShading, side:THREE.DoubleSide});
  this.terrain1 = new THREE.MeshLambertMaterial( {color:settings.theme.terrainColor1, shading:THREE.FlatShading });
  this.terrain2 = new THREE.MeshLambertMaterial( {color:settings.theme.terrainColor2, shading:THREE.FlatShading });
  this.terrain3 = new THREE.MeshLambertMaterial( {color:settings.theme.terrainColor3, shading:THREE.FlatShading });
  this.clouds = new THREE.MeshLambertMaterial({wireframe:false,shading:THREE.FlatShading,color:Themes.white});
  this.icon = createIconMaterial()
  this.iconReflection = createIconReflectionMaterial()
  this.animal = createAnimalMaterial( textureLoadedCallback );

  this.obstacle = new THREE.MeshLambertMaterial({opacity:0.6, side:THREE.DoubleSide, color:settings.theme.puckColor });
  this.obstacle2 = createObstacleMaterial()
  this.obstacleSide = createObstacleSideMaterial()
  this.forceAttract = createForceMaterial()
  this.forceRepell = createForceMaterial()
  this.puck = new THREE.MeshLambertMaterial( { color: Themes.white });
  this.blink = new THREE.MeshLambertMaterial( { color: settings.theme.puckColor,transparent:false });
  this.bullet = new THREE.MeshLambertMaterial( { transparent:false, depthWrite:true,color: settings.theme.puckColor})

  //extras
  this.fire = new THREE.MeshLambertMaterial( {color:new THREE.Color(settings.data.fireColor), transparent:true, opacity:0.5, side:THREE.DoubleSide});
  this.bomb = new THREE.MeshLambertMaterial( {color:0xffa200, transparent:true, opacity:0.5,depthWrite:false});
  this.extraActivate = new THREE.MeshLambertMaterial( {color:new THREE.Color(settings.data.iconColor), transparent:true, opacity:0.4,depthWrite:false});
  this.ghost = new THREE.MeshLambertMaterial( {color:0xffffff, transparent:true, opacity:1, side:THREE.DoubleSide});
  this.fog2 = createFog2()


  this.idleReflection = createIdleReflection()


  //start force animation, optimize this
  TweenMax.to(this,0.3,{repeat:-1,onRepeat:function(){

    //force attract
    var tilePos = this.forceAttract.map.tilePos;
    tilePos.x += 1;
    if( tilePos.x > 1) {
      tilePos.x = 0;
      tilePos.y++;
      if( tilePos.y > 1) {
        tilePos.y = 0
      }
    }

    this.forceAttract.map.offset.x = tilePos.x/2
    this.forceAttract.map.offset.y = tilePos.y/2

    //force repell
    tilePos = this.forceRepell.map.tilePos;
    tilePos.x -= 1;
    if( tilePos.x < 0) {
      tilePos.x = 1;
      tilePos.y--;
      if( tilePos.y < 0) {
        tilePos.y = 1
      }
    }
    this.forceRepell.map.offset.x = tilePos.x/2
    this.forceRepell.map.offset.y = tilePos.y/2
  }.bind(this)})

  this.updateColors = function(){

   /* var sideColor = new THREE.Color().setHex(settings.theme.arenaColor).getHSV();
    sideColor.v *= 0.8;
    this.arenaSideColorMaterial.color.setHSV(sideColor.h,sideColor.s,sideColor.v);
*/

    //this.arenaGrid.uniforms.arenaColor.value.set(settings.theme.arenaColor);

    updateIdleReflection(this.idleReflection.map.image, new THREE.Color(settings.theme.arenaColor) )
    this.idleReflection.map.needsUpdate = true;

    tweenColor(this.arenaGrid.uniforms.arenaColor.value,settings.theme.arenaColor, function(value){
      this.arenaSideColorMaterial.color.setHSV(value.h, value.s, value.v)
      this.reflectionBox.color.setHSV(value.h, value.s, value.v)

    }.bind(this))

    tweenColor(this.terrain1.color,settings.theme.terrainColor1)
    tweenColor(this.terrain2.color,settings.theme.terrainColor2)
    tweenColor(this.terrain3.color,settings.theme.terrainColor3)
    tweenColor(this.treeBranches.color,settings.theme.treeBranchColor)



    /*
    this.reflectionBox.color.set( settings.theme.arenaColor );
    this.terrain1.color.set( settings.theme.terrainColor1 );
    this.terrain2.color.set( settings.theme.terrainColor2 );
    this.terrain3.color.set( settings.theme.terrainColor3 );
    this.treeBranches.color.set( settings.theme.treeBranchColor );
    this.arenaGrid.uniforms.arenaColor.value.set(settings.theme.arenaColor);
    this.arenaSideColorMaterial.color.set( settings.theme.arenaColor );*/

    this.opponent.uniforms.arenaColor.value.set(settings.theme.arenaColor);

    this.obstacle2.uniforms.diffuse.value.set(settings.theme.arenaColor);
    this.obstacle2.uniforms.gridBrightness.value = settings.theme.gridBrightness;

    this.icon.uniforms.diffuse.value.set( settings.theme.iconColor );
    this.extraActivate.color.set( settings.theme.iconColor );
    this.obstacle.color.set( settings.theme.puckColor );
    this.iconReflection.uniforms.diffuse.value.set( settings.theme.iconColor );
    this.animal.uniforms.ambient.value.set( settings.theme.terrainColor1 );
    this.shield.color.set(settings.theme.shieldColor);

    this.arenaGrid.uniforms.gridBrightness.value = settings.theme.gridBrightness;
    this.cpuBackdrop.color.set(settings.theme.cpuBackdropColor);
    this.puck.color.set(settings.theme.puckColor);
    this.blink.color.set(settings.theme.puckColor);

  }

  settings.on('colorsUpdated', this.updateColors.bind(this) )
  this.updateColors();

  function tweenColor(target, to, updateCallback ) {

    var fromHSV = target.clone().getHSV()

    var toHSV = new THREE.Color(to).getHSV();

    var hDiff = Math.abs(toHSV.h-fromHSV.h);

    if( hDiff > 0.6 ) {
      var edge = ( toHSV.h > 0.5 )?0:1;
      TweenMax.to(fromHSV,0.25, {h: edge, onComplete:function(){
        fromHSV.h = (fromHSV.h<0.5)?1:0;
        TweenMax.to(fromHSV,0+0.25, {h: toHSV.h});
      }.bind(this)})
    }
    else {
      TweenMax.to(fromHSV,0.5, {h: toHSV.h});
    }

    TweenMax.to(fromHSV,0.5, { s: toHSV.s, v: toHSV.v, onUpdate:function(){
      target.setHSV(fromHSV.h, fromHSV.s, fromHSV.v);
      if( updateCallback) {
        updateCallback(fromHSV)
      }
    }.bind(this)})
  }

  function textureLoadedCallback() {
    --pending || preloadedTexturesDone()
  }

  function preloadedTexturesDone(){
    //console.log('all textures done',materials);
    materials.emit('isDone')
  }

}

Materials.prototype.setPixelFormat = function(type){
  if( type === materials.PIXEL_FORMAT_RGB ) {
    this.opponent.uniforms.bgr.value = 0
    this.me.uniforms.bgr.value = 0
  }
  else if( type === materials.PIXEL_FORMAT_BGR) {
    this.opponent.uniforms.bgr.value = 1
    this.me.uniforms.bgr.value = 1
  }
}

Materials.prototype.setMaxAnisotropy = function( value ) {

  this.arenaGrid.uniforms.tGrid.value.anisotropy = value;
  this.animal.uniforms.map.value.anisotropy = value;
  this.decal1.map.anisotropy = value;
  this.decal2.map.anisotropy = value;
  this.screenDecal1.map.anisotropy = value;
  this.screenDecal2.map.anisotropy = value;
  this.digitsPlayer1.map.anisotropy = value;
  this.digitsPlayer2.map.anisotropy = value;
  this.obstacle2.uniforms.tGrid.value.anisotropy = value;
  this.centerLine.map.anisotropy = value;
}

Materials.prototype.update = function(world){

  var tex;

 // if( settings.data.quality == settings.QUALITY_HIGH ) {
    tex = this.remoteVideoTexture;
    if( tex && tex.image.readyState === tex.image.HAVE_ENOUGH_DATA ){
      tex.needsUpdate = true;
    }
  /*}
  else if( settings.data.quality == settings.QUALITY_LOW || settings.data.quality == settings.QUALITY_MOBILE){
    var el = document.getElementById('remoteInput');

    if( el.readyState === el.HAVE_ENOUGH_DATA ){

      this.remoteVideoDownscaledCanvas.getContext('2d').drawImage(el, 0, 0, 256, Math.round(256/16*9));
      this.remoteVideoDownscaledTexture.needsUpdate = true;
    }
  }*/

  tex = this.me.uniforms.tVideo.value;
  if( this.showLocalVideo && tex.image && tex.image.readyState === tex.image.HAVE_ENOUGH_DATA ){
    tex.needsUpdate = true;
  }

  this.digitsPlayer1.map.offset.x = 1/5*world.players.a.score;
  this.digitsPlayer2.map.offset.x = 1/5*world.players.b.score;

  // update global shader time
  this.icon.uniforms.time.value += 0.03;
  this.opponent.uniforms.time.value += 0.1;
  this.me.uniforms.time.value += 0.1;
  this.iconReflection.uniforms.time.value += 0.03;
  this.overlayNoise.uniforms.time.value += 0.04;
  this.blink.opacity = (this.blink.opacity === 0 )?1:0;
}


Materials.prototype.updateScreenSize = function(w,h) {
  this.overlay.uniforms.resolution.value = new THREE.Vector2( w, h );
}


function createArenaGrid(renderer){

  var gridTexture = THREE.ImageUtils.loadTexture( '/images/grid.png' );
  gridTexture.mapping = THREE.UVMapping;
  gridTexture.minFilter = THREE.LinearMipMapLinearFilter;
  gridTexture.magFilter = THREE.LinearFilter;
  gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;

  return new THREE.ShaderMaterial({
    transparent:true,
    depthWrite:false,
    uniforms: {
      tGrid: { type: 't', value: gridTexture},
      scale: { type: 'v2', value: new THREE.Vector2(settings.data.arenaColumns ,settings.data.arenaRows ) },
      resolution: { type:'v2', value: new THREE.Vector2(settings.data.arenaWidth,settings.data.arenaHeight*0.5)},
      gridBrightness: { type: 'f', value: settings.theme.gridBrightness },
      arenaColor: { type: 'c', value: new THREE.Color(settings.theme.arenaColor) }
    },
    vertexShader: shaders.simple_vs,
    fragmentShader: shaders.arena_fs
  });
}


function createIdleReflection(){
   var canvas = document.createElement( 'canvas' );
  canvas.width = 128;
  canvas.height = 128;
  var texture = new THREE.Texture( canvas );

  return new THREE.MeshBasicMaterial( {  map: texture, depthWrite:true,transparent:false,side:THREE.DoubleSide} );
}

function updateIdleReflection( canvas, c2 ) {
  var context = canvas.getContext( '2d' );

  var gradient = context.createLinearGradient( 0, 0, 0 , canvas.height);
  var c = new THREE.Color(Themes.white);

  gradient.addColorStop( 0, 'rgba('+c.r*255+','+c.g*255+','+c.b*255+',1)' );
  gradient.addColorStop( 0.3, 'rgba('+c2.r*255+','+c2.g*255+','+c2.b*255+',1)' );

  context.fillStyle = gradient;
  context.fillRect( 0, 0, canvas.width, canvas.height );

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
  var canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle =  'rgba(0, 0, 0)';
  ctx.fillRect(0,0, 256, 256);

  var brokenTexture = new THREE.Texture( canvas );

  var uniforms = {
    time:  { type: 'f', value: 1.0 },
    noiseAmount:  { type: 'f', value: 0 },
    tVideo: { type: 't', value: brokenTexture  },
    tBroken: { type: 't', value: brokenTexture },
    resolution: { type:'v2', value: new THREE.Vector2(512,360)},
    arenaColor: { type: 'c', value: new THREE.Color(settings.theme.arenaColor) },
    bgr: { type: 'i', value: 0 }
  };

  var mat = new THREE.ShaderMaterial({
    wireframe:false,
    transparent:false,
    uniforms:   uniforms,
    side:THREE.DoubleSide,
    vertexShader:   shaders.simple_vs,
    fragmentShader: (settings.data.quality === settings.QUALITY_MOBILE )?shaders.video_mobile_fs:shaders.video_fs
  });

  //TODO: Save broken info in video alpha channel.

  //save shortcut
  mat.brokenTextureCtx = ctx;

  return mat;

}
/*
function createRemoteVideoDownscaledCanvas() {
  var canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = Math.round(256/16*9);
  return canvas;
}
*/
function createMeMaterial() {

  var texture = new THREE.Texture(document.getElementById('localInput'));
  texture.generateMipmaps = false;
  texture.format = THREE.RGBFormat;

  var uniforms = {
    time:  { type: 'f', value: 1.0 },
    noiseAmount:  { type: 'f', value: 1 },
    tVideo: { type: 't', value: texture  },
    bgr: { type: 'i', value: 0 }
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
  var texture;

  if( typeof element === 'string' ) {
    texture = new THREE.Texture(document.getElementById(element));
  }
  else {
    texture = new THREE.Texture(element);
  }

  texture.generateMipmaps = false;
  texture.format = THREE.RGBFormat;
  return texture;
}


function createShadow( textureLoadedCallback ){
  return new THREE.MeshBasicMaterial({
    depthWrite:false,
    transparent:true,
    blending:THREE.MultiplyBlending,
    depthTest: true,
    map:THREE.ImageUtils.loadTexture('/images/radial_gradient_white.png',null,textureLoadedCallback)
  })
}


function createIconMaterial(){

  return new THREE.ShaderMaterial({
    transparent:true,

    uniforms:  THREE.UniformsUtils.merge( [

      THREE.UniformsLib[ 'common' ],
      THREE.UniformsLib[ 'lights' ],

      {
        'ambient'  : { type: 'c', value: new THREE.Color( 0x444444 ) },
        'emissive' : { type: 'c', value: new THREE.Color( 0x000000 ) },
        'wrapRGB'  : { type: 'v3', value: new THREE.Vector3( 0, 0, 1 ) },
        'diffuse': { type: 'c', value: new THREE.Color(settings.theme.iconColor) },
        'opacity': { type: 'f', value: 0.8 },
        'time':  { type: 'f', value: 0 }
      }

    ] ),
    vertexShader: [

      '#define LAMBERT',

      'varying vec3 vLightFront;',
      'varying vec3 vWorldPosition;',
      'uniform float time;',
      '#ifdef DOUBLE_SIDED',
        'varying vec3 vLightBack;',
      '#endif',

      THREE.ShaderChunk[ 'lights_lambert_pars_vertex' ],
      THREE.ShaderChunk[ 'color_pars_vertex' ],

      'void main() {',

        THREE.ShaderChunk[ 'color_vertex' ],
        THREE.ShaderChunk[ 'defaultnormal_vertex' ],
        THREE.ShaderChunk[ 'default_vertex' ],

        THREE.ShaderChunk[ 'lights_lambert_vertex' ],

        'vec4 myWorldPosition = modelMatrix * vec4( position, 1.0 );',
        'vWorldPosition = myWorldPosition.xyz;',

        'vec3 newPosition = position;',
        'newPosition.y += sin(time*5.0)*10.0;',

        'float Angle = sin(time);',

        'mat4 RotationMatrix = mat4(',
                'cos( Angle ),  0.0, -sin( Angle ), 0.0,',
                '0.0,  1, 0.0, 0.0,',
                'sin( Angle ), 0.0, cos( Angle ), 0.0,',
                '0.0, 0.0, 0.0, 1.0 );',

        'gl_Position = projectionMatrix * modelViewMatrix * RotationMatrix* vec4( newPosition , 1.0 );',

      '}'

    ].join('\n'),
    fragmentShader: [
      'uniform float opacity;',

      'varying vec3 vLightFront;',
      'varying vec3 vWorldPosition;',

      '#ifdef DOUBLE_SIDED',

        'varying vec3 vLightBack;',

      '#endif',

      THREE.ShaderChunk[ 'color_pars_fragment' ],
      THREE.ShaderChunk[ 'map_pars_fragment' ],

      'void main() {',

        'gl_FragColor = vec4( vec3 ( 1.0 ), (opacity-0.5)+0.5*step(-200.0,vWorldPosition.y) );',

        '#ifdef DOUBLE_SIDED',

           'if ( gl_FrontFacing )',
            'gl_FragColor.xyz *= vLightFront;',
          'else',
            'gl_FragColor.xyz *= vLightBack;',

        '#else',

          'gl_FragColor.xyz *= vLightFront;',

        '#endif',

        THREE.ShaderChunk[ 'color_fragment' ],

        THREE.ShaderChunk[ 'linear_to_gamma_fragment' ],


      '}'

    ].join('\n'),
    wireframe:false,
    lights:true
  });
}

function createIconReflectionMaterial(){
  return new THREE.ShaderMaterial({
    uniforms:  THREE.UniformsUtils.merge( [

      THREE.UniformsLib[ 'common' ],
      {
        'diffuse': { type: 'c', value: new THREE.Color(settings.theme.iconColor)},
        'opacity': { type: 'f', value: 1 },
        'time':  { type: 'f', value: 0 }
      }

    ] ),
    vertexShader: [

      'varying vec3 vWorldPosition;',
      'uniform float time;',
      'uniform vec3 diffuse;',

      'void main() {',
        'vec4 worldPosition = modelMatrix * vec4( position, 1.0 );',
        'vWorldPosition = worldPosition.xyz;',
        'vec3 newPosition = position;',
        'newPosition.y += sin(time*5.0)*10.0;',

        'float Angle = sin(time);',

        'mat4 RotationMatrix = mat4(',
                'cos( Angle ),  0.0, -sin( Angle ), 0.0,',
                '0.0,  1, 0.0, 0.0,',
                'sin( Angle ), 0.0, cos( Angle ), 0.0,',
                '0.0, 0.0, 0.0, 1.0 );',

        'gl_Position = projectionMatrix * modelViewMatrix * RotationMatrix* vec4( newPosition , 1.0 );',

      '}'

    ].join('\n'),
    fragmentShader: [

      'varying vec3 vWorldPosition;',
      'uniform vec3 diffuse;',

      'void main() {',
        'gl_FragColor = vec4(diffuse, 1.0-vWorldPosition.y/-300.0);',

      '}'

    ].join('\n'),
    wireframe:false,
    transparent:true,
    side:THREE.FrontSide,
    lights:false
  });
}


function createAnimalMaterial( textureLoadedCallback ){

  var texture = THREE.ImageUtils.loadTexture( '/images/animals_texture_10.jpg', null, textureLoadedCallback );
  texture.flipY = false;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;

  var uniforms = {

    details:  { type: 'c', value: new THREE.Color(Themes.white) },
    ambient:  { type: 'c', value: new THREE.Color(0x4d87dc) },
    diffuse:  { type: 'c', value: new THREE.Color(0x000000).setRGB(81/255,72/255,66/255) },
    map: { type: 't', value: texture  }

  };

  var shaderMat =  new THREE.ShaderMaterial({
      morphTargets:true,
      uniforms: uniforms,
      vertexShader: shaders.animal_vs,
      fragmentShader: shaders.animal_fs
    });

  return shaderMat;
}

function createDecal(texture ) {

  var decalTexture = THREE.ImageUtils.loadTexture('/images/playerbox_decals3.png')
  decalTexture.minFilter = THREE.LinearMipMapLinearFilter;
  decalTexture.magFilter = THREE.LinearFilter;

  return new THREE.MeshLambertMaterial({
    map:decalTexture,
    lights:false,
    transparent:true})
}

function createScreenDecal() {

  var texture = THREE.ImageUtils.loadTexture('/images/video-decal.png')
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return new THREE.MeshLambertMaterial({
    map:texture,
    lights:false,
    transparent:true})
}

function createFog2() {

  var canvas = document.createElement( 'canvas' );
  canvas.width = 64;
  canvas.height = 64;

  var context = canvas.getContext( '2d' );
  var gradient = context.createLinearGradient( 0, 0, 0 , canvas.height);
  var c = new THREE.Color(0xeeeeee);

  gradient.addColorStop( 0.4, 'rgba('+c.r*255+','+c.g*255+','+c.b*255+',0.98)' );
  gradient.addColorStop( 1, 'rgba('+c.r*255+','+c.g*255+','+c.b*255+',0.4)' );

  context.fillStyle = gradient;
  context.fillRect( 0, 0, canvas.width, canvas.height );

  var gradientTexture = new THREE.Texture( canvas );
  gradientTexture.needsUpdate = true;

  return new THREE.MeshBasicMaterial( { map: gradientTexture, depthWrite:true,transparent:true,opacity:0, side:THREE.DoubleSide} );
}


function createObstacleMaterial(renderer) {

  var gridTexture = THREE.ImageUtils.loadTexture( '/images/grid.png' );
  gridTexture.mapping = THREE.UVMapping;
  gridTexture.minFilter = THREE.LinearMipMapLinearFilter;
  gridTexture.magFilter = THREE.LinearFilter;
  gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;

  return new THREE.ShaderMaterial({
    transparent: false,
    uniforms: {
      tGrid: { type: 't', value: gridTexture},
      gridBrightness: { type: 'f', value: settings.theme.gridBrightness },
      centerLineAmount: { type: 'f', value: 0.6 },
      diffuse: { type: 'c', value: new THREE.Color(settings.theme.arenaColor) },
      resolution: { type:'v2', value: new THREE.Vector2(settings.data.arenaWidth,settings.data.arenaHeight)},
      scale: { type: 'v2', value: new THREE.Vector2(settings.data.arenaColumns , 26 ) }
    },
    vertexShader: shaders.nano_vs,
    fragmentShader: shaders.obstacle_fs
  });

}

function createObstacleSideMaterial(renderer) {

  var canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle =  'rgba(255, 255, 255, 0)';
  ctx.fillRect(0,0, 8, 8);

  return new THREE.ShaderMaterial({
    transparent: false,
    uniforms: {
      tGrid: { type: 't', value: canvas},
      diffuse: { type: 'c', value: new THREE.Color(Themes.white)},
      resolution: { type:'v2', value: new THREE.Vector2(settings.data.arenaWidth,settings.data.arenaHeight)},
      gridBrightness: { type: 'f', value: 0},
      centerLineAmount: { type: 'f', value: 0 },
      scale: { type: 'v2', value: new THREE.Vector2(settings.data.arenaColumns , 26 ) }
    },
    vertexShader: shaders.simple_vs,
    fragmentShader: shaders.obstacle_fs
  });

}

function createOverlayMaterial() {

  var tapeTexture = THREE.ImageUtils.loadTexture( '/images/tape_overlay.jpg' );
  tapeTexture.mapping = THREE.UVMapping;
  tapeTexture.minFilter = THREE.LinearFilter;
  tapeTexture.magFilter = THREE.LinearFilter;
  var uniforms = {
    resolution: { type: 'v2', value: new THREE.Vector2(window.innerWidth,window.innerHeight) },
    tTape: { type: 't', value: tapeTexture},
    gridAmount: { type: 'f', value: settings.data.cameraGrid}
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

function createDigitsMaterial(){

  var texture = THREE.ImageUtils.loadTexture( '/images/grid_trans5.png' );
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  texture.repeat = new THREE.Vector2(0.2,0.172*2);
  texture.offset = new THREE.Vector2(0,0);

  var uniqueTexture = texture;

  return new THREE.MeshBasicMaterial( {
    transparent:true,
    opacity:0.9,
    depthWrite:false,
    //blending:THREE.AdditiveBlending,
    map:texture
  } );
}

function createOverlayNoiseMaterial() {

  var canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle =  'rgba(255, 255, 255, 1)';
  ctx.fillRect(0,0, 512, 512);

  var brokenTexture = new THREE.Texture( canvas );

  var miniSceneRenderTarget = new THREE.WebGLRenderTarget( 128, 128,  { minFilter: THREE.LinearLinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, useStencilBuffer:false } );
  miniSceneRenderTarget.generateMipmaps = false;

  var uniforms = {
    time:  { type: 'f', value: 1.0 },
    noiseAmount:  { type: 'f', value: 0.8 },
    tVideo: { type: 't', value: miniSceneRenderTarget  },
    tBroken: { type: 't', value: brokenTexture },
    resolution: { type:'v2', value: new THREE.Vector2(128,128)}

  };

  var mat = new THREE.ShaderMaterial({
    wireframe:false,
    transparent:false,
    uniforms:   uniforms,
    vertexShader:   shaders.simple_vs,
    fragmentShader: (settings.data.quality === settings.QUALITY_MOBILE )?shaders.video_mobile_fs:shaders.video_fs
  });

  return mat;

}

function createOverlayMirrorMaterial() {

  var miniSceneRenderTarget = new THREE.WebGLRenderTarget( 1024, 512,  { minFilter: THREE.LinearLinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, useStencilBuffer:false } );
  miniSceneRenderTarget.generateMipmaps = true;

  return new THREE.MeshBasicMaterial( {map:miniSceneRenderTarget,side:THREE.DoubleSide,transparent:false} );

}

function createForceMaterial() {
  var texture = THREE.ImageUtils.loadTexture( '/images/texture_force_trans.png' );
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.repeat = new THREE.Vector2(0.5,0.5);
  texture.offset = new THREE.Vector2(0,0);

  texture.tilePos = new THREE.Vector2( 0, 0 );

  return new THREE.MeshBasicMaterial( {
    transparent:true,
    opacity:0.9,
    depthWrite:false,
    //blending:THREE.AdditiveBlending,
    map:texture
  } );
}

function createCenterLineMaterial() {
  var texture = THREE.ImageUtils.loadTexture( '/images/grid_trans5.png' );
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.repeat = new THREE.Vector2(0.099*2.1*0.21,0.178*2*0.3);
  texture.offset = new THREE.Vector2(0,0.102);

  return new THREE.MeshLambertMaterial({map:texture, transparent:true,side:THREE.DoubleSide,opacity:0.9})
}

