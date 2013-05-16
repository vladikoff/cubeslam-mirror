var Emitter = require('emitter')
  , Themes = require('./themes');

var settings = Emitter(exports);

settings.CAMERA_SCRIPTED = 0
settings.CAMERA_FPS = 1
settings.CAMERA_CLASSIC = 2
settings.CAMERA_RABBIT = 3
settings.CAMERA_MOUNTAINVIEW = 4

settings.QUALITY_BEST = 'best'
settings.QUALITY_HIGH = 'high'
settings.QUALITY_LOW = 'low'
settings.QUALITY_MOBILE = 'mobile'

// the default theme
// to be overridden by levels
settings.ai = null;
settings.theme = Themes.current;

settings.data = {

  // defaults (will be set in /states/game/multiplayer.js)
  defaultFramerate: 60,
  defaultTimestep: 1000/60,
  defaultUnitSpeed: 18,
  maxUpdatesPerFrame: 15,

  cameraType:settings.CAMERA_SCRIPTED,
  antialias: false,
  cameraFov: 50,
  cameraOverlay: true,
  cameraGrid: 0,
  godMode: false,
  showDebugInfo: false,
  //overrideCamera: '',
  wireframeOverride:false,
  terrainNormals:false,
  fpsCamera: false,

  // a bit of a hack to work around an
  // issue found on android devices
  // where they read the video textures
  // in a BGR format instead of the expected
  // RGB. by setting this to true the colors
  // will be flipped in the shaders.
  bgr: false,

  // game
  arenaWidth: 1700,
  arenaHeight: 1700/18*26,
  arenaColumns: 18,
  arenaRows: 26,
  unitSize: Math.round(1700/18), //= 94
  arenaSideHeight: 200,
  shieldPadding:2,
  defaultShields: 3,
  videoBoxDepth:700,
  paddleMass: 0.8,
  paddleDamping: 0.8,

  // minimum Y velocity of puck
  minYSpeed: 10,

  // speed of bullets
  // (multiplier of unitSpeed)
  bulletSpeed: 1.6,

  // time in ms how long a newly spawned
  // extra should be GHOSTed. this is so
  // the user has time to see what it is
  // first.
  extraGhostDuration: 400,

  // the default probability of an extra
  // to be spawned. so if for example only
  // one of the available extras defines
  // a probability of `1` it will be 10x
  // less likely then all the other extras
  // to be found.
  defaultProbability: 10,

  // the interval on which the forces
  // will toggle between active/inactive
  // set to 0 or non-number to disable.
  forcesInterval: 3000,

  // turn on paddle 'slam' effect
  paddleMomentum: true,

  // special 'speedup' which is damped
  // until it goes back to the normal
  // speed.
  speedupMomentum: true,

  // if the puck hit momentum should affect
  // the direction
  directionMomentum: true,

  // when true the collision reflection angle
  // is based on the edge intersecting the
  // centroid of the two colliding shapes instead
  // of the `nearestEdge` guessed by `poly.collide()`.
  // It may use a few more cycles on collision but
  // makes the bouncing much more reliable.
  improvedNormals: true,

  // the amount we narrow down the angle of reflection
  // with or without momentum.
  // higher value means more narrow as it's a divisor
  // of the position on the paddle.
  steerWidth: 2,
  steerWidthMomentum: 3,

  fireballSpeedup: 1.5,

  interpolationMaxFrames: 10,    // set to 0 to turn off
  interpolationMinDistance: 1,   // distance in pixels
  interpolationMaxDistance: 500, // distance in pixels

  clearColor: 0xedecd6,
  fireColor: 0xefce06,
  fireColor2: 0xff0000,

  //ambientLightColor: 0x444444,
  //ambientLightIntensity: 0.40,
  dirLightColor: 0xffffff,
  dirLightIntensity: 0.88,
  dirLightX: 0.107,
  dirLightY: 0.15,
  dirLightZ: 0.07,
  hemisphereLightSkyColor: 0xffffff,
  hemisphereLightGroundColor: 0xb1b1b1,
  hemisphereLightIntensity:0.74,
  useShadows:false,
  arenaSurfaceY: -200,

  hue: 0,
  saturate: 100,
  extraHue:0,
  extraSaturate: 100,

  quality: 'high',
  overrideSpawnExtras: false,
  spawnExtras: {
    bulletproof: false,
    mirroredcontrols: false,
    fog: false,
    extralife: false,
    ghostball: false,
    fireball: false,
    multiball: false,
    paddleresize: false,
    timebomb: false,
    laser: false,
    deathball: false
  },
  testCPUMorph: -1,

  // networking
  keepAliveInterval: 250, // ms
  sendRate: 15, // hz

  // controls
  mouseSensitivity: 0.07,
  keyboardSensitivity: 0.9,
  invertControls: false,

  forrestPredefined:true,
  forrestThreshold:0.5,
  forrestGridX:200,
  forrestGridY:200,
  forrestBaseScale:0.5,
  forrestRandomSeed:0.5
}

// [t,r,b,l]
settings.data.bounds = [0,settings.data.arenaWidth,settings.data.arenaHeight,0];
settings.data.framerate = settings.data.defaultFramerate;
settings.data.timestep = settings.data.defaultTimestep;
settings.data.unitSpeed = settings.data.defaultUnitSpeed;


settings.emit('lightsUpdated');

settings.getSpawnlist = function(){
  var list = [];
  for (var key in settings.data.spawnExtras) {
    if(settings.data.spawnExtras[key]){
      list.push({id: key});
    }
  }
  return list;
}

settings.changeTheme = function(theme){
  for( var key in theme ) {
    if( settings.theme.hasOwnProperty(key) ){
      settings.theme[key] = theme[key];
    }
  }
  settings.emit('colorsUpdated');
}

