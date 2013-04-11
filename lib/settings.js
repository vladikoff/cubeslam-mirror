var Emitter = require('emitter')
  , world = require('./world')
  , actions = require('./actions')
  , keys = require('mousetrap')
  , Themes = require('./themes')
  , $ = require('jquery');

var gui;


var settings = Emitter(exports);

settings.CAMERA_SCRIPTED = 0
settings.CAMERA_FPS = 1
settings.CAMERA_CLASSIC = 2
settings.CAMERA_RABBIT = 3
settings.CAMERA_MOUNTAINVIEW = 4

// the default theme
// to be overridden by levels
settings.ai = null;
settings.theme = Themes.current;

var extraRows = [];

settings.data = {

  cameraType:settings.CAMERA_SCRIPTED,
  antialias: true,
  cameraFov: 50,
  cameraOverlay: true,
  cameraGrid:0,
  godMode:false,
  showDebugInfo: false,
  //overrideCamera: "",
  fpsCamera: false,

  // game
  arenaWidth: 1700,
  arenaHeight: 1700/18*26,
  arenaColumns: 18,
  arenaRows: 26,
  unitSize: Math.round(1700/18), //= 94
  unitSpeed: 18,
  arenaSideHeight: 200,
  shieldPadding:2,
  defaultShields: 3,
  videoBoxDepth:700,
  paddleMass: .8,
  paddleDamping: 0.8,

  // minimum Y velocity of puck
  minYSpeed: 10,

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

  // special "speedup" which is damped
  // until it goes back to the normal
  // speed.
  speedupMomentum: true,

  // if the puck hit momentum should affect
  // the direction
  momentumDirection: false,

  interpolationMinDistance: 1, // px/frame
  interpolationMaxDistance: 10, // px/frame
  interpolationMaxFrames: 30, // 0 to turn off

  // info
  replayed:0,
  frame: 0,
  speed: 0.000001,

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

  overrideSpawnExtras:false,
  spawnExtras: {},
  testCPUMorph:-1,

  // networking
  keepAliveInterval: 250, // ms
  sendRate: 15, // hz

  // controls
  mouseSensitivity: .3,
  keyboardSensitivity: .9,
  invertControls: false,

  forrestPredefined:true,
  forrestThreshold:0.5,
  forrestGridX:200,
  forrestGridY:200,
  forrestBaseScale:0.5,
  forrestRandomSeed:0.5
}

settings.data.spawnExtras['bulletproof'] = false
settings.data.spawnExtras['mirroredcontrols'] = false
settings.data.spawnExtras['fog'] = false
settings.data.spawnExtras['extralife'] = false
settings.data.spawnExtras['ghostball'] = false
settings.data.spawnExtras['fireball'] = false
settings.data.spawnExtras['multiball'] = false
settings.data.spawnExtras['paddleresize'] = false
settings.data.spawnExtras['timebomb'] = false
settings.data.spawnExtras['laser'] = false
settings.data.spawnExtras['deathball'] = false

lightsUpdated()

settings.createGenericUI = function( initParams ) {
  // dat.GUI is global, included in the HTML
  gui = new dat.GUI({ autoPlace: false });
  settings.gui = gui;

  gui.width = 400;
  document.getElementById("settingsDataGUI").appendChild(gui.domElement);

  gui.domElement.addEventListener("click", logSettingsClick)

  function logSettingsClick(){
    gui.domElement.removeEventListener("click", logSettingsClick)
    _gaq.push(['_trackEvent', 'settings', 'open']);
  }

  var f;

  f = gui.addFolder('Generic');
  f.add(settings,"shortcut",'O').name("Show panels")
  f.add(settings,"shortcut",'0').name("Debug renderer")
  f.add(settings, 'shortcut','P').name('Add puck');
  f.add(settings, 'shortcut','E').name('Explode');
  f.add(settings, 'shortcut','H').name('Heal');
  f.add(settings, 'shortcut','M').name('Mirror effect');
  f.add(settings.data, 'godMode').name('God mode');

  f = gui.addFolder('Camera');
  f.add(settings.data, 'cameraType',{'Scripted (1)':0,'FPS (2)':1,'Classic (3)':2,'Rabbit Cam (4)':3,'Mountain View (5)':4}).name('Mode').listen().onChange(function(value){
    settings.data.cameraType = parseInt(value);
    this.emit("cameraTypeChanged")
  }.bind(this));
  f.add(settings.data,"cameraOverlay").name("Overlay").onChange(function(){
    this.emit("cameraSettingsChanged")
  }.bind(this))
  f.add(settings.data,"cameraFov").min(10).max(100).step(1).name("FOV").onChange(function(){
    this.emit("cameraSettingsChanged")
  }.bind(this))
  f.add(settings.data,"cameraGrid").min(0).max(1).name("Scanlines").onChange(function(){
    this.emit("cameraSettingsChanged")
  }.bind(this))
  f.add(settings, 'shortcut','C').name('Log position');


  f = gui.addFolder('Theme');
  this.themelist = {};
  for (var i = Themes.list.length - 1; i >= 0; i--) {
    this.themelist[Themes.list[i].name] = i
  };

  f.add(this,"themelist",this.themelist).name("Presets").onChange(function(value){
    Themes.goto(parseInt(value)-1);
  })

  f.addColor(settings.theme, 'shieldColor').name("Shield color").onChange(colorsUpdated);
  f.addColor(settings.theme, 'puckColor').name("Puck").onChange(colorsUpdated);
  f.addColor(settings.theme, 'arenaColor').name("Arena").onChange(colorsUpdated);
  f.addColor(settings.theme, 'terrainColor1').name("Terrain1").onChange(colorsUpdated);
  f.addColor(settings.theme, 'terrainColor2').name("Terrain2").onChange(colorsUpdated);
  f.addColor(settings.theme, 'terrainColor3').name("Terrain3").onChange(colorsUpdated);
  f.addColor(settings.theme, 'treeBranchColor').name("Trees").onChange(colorsUpdated);
  f.addColor(settings.theme, 'iconColor').name("Icons").onChange(colorsUpdated);
  f.addColor(settings.theme, 'cpuBackdropColor').name("CPU backdrop").onChange(colorsUpdated);
  f.add(settings.theme, 'gridBrightness').min(0).max(1).name("Grid brightness").onChange(colorsUpdated);


  if( initParams.isMobile ) {
    f = gui.addFolder('Mobile Colors');
    f.add(settings.data, 'hue').min(0).max(360).name("Hue").onChange(mobileColor);
    f.add(settings.data, 'saturate').min(0).max(100).name("Saturate").onChange(mobileColor);
    f.add(settings.data, 'extraHue').min(0).max(360).name("Extras Hue").onChange(mobileExtrasColor);
    f.add(settings.data, 'extraSaturate').min(0).max(100).name("Extras Saturate").onChange(mobileExtrasColor);
  }

  f = gui.addFolder('Extras');
  f.add(settings.data,"overrideSpawnExtras").name("override extras").onChange(setExtraStatus);
  for (var key in settings.data.spawnExtras) {
    var item = f.add(settings.data.spawnExtras,key).name(key);
    extraRows[key] = item;
  }
  setExtraStatus()

  f = gui.addFolder('Paddle');
  f.add(settings.data, 'speedupMomentum').name('Use momentum');
  f.add(settings.data, 'paddleMass').min(0).max(1).name("Mass");
  f.add(settings.data, 'paddleDamping').min(0).max(1).name("Damping");
  f.add(settings.data, 'keyboardSensitivity').min(0).max(1).name("Keyboard Sens.");
  f.add(settings.data, 'mouseSensitivity').min(0).max(1).name("Mouse/Touch Sens.");

  f = gui.addFolder('Forrest');
  f.add(settings.data, 'forrestThreshold').min(0).max(1).name('Amount');
  f.add(settings.data, 'forrestGridX').min(50).max(500).name('Grid Size X');
  f.add(settings.data, 'forrestGridY').min(50).max(500).name('Grid Size Y');
  f.add(settings.data, 'forrestBaseScale').min(0).max(3).name('Base Scale');
  f.add(settings.data, 'forrestRandomSeed').min(0).max(10).name('Forrest/Random');
  f.add(settings, 'createForrest').name('Generate');

  f = gui.addFolder('Lights');
  f.addColor(settings.data, 'dirLightColor').name("Dir color").onChange(lightsUpdated);
  f.add(settings.data, 'dirLightIntensity').min(0).max(2).name("Dir").onChange(lightsUpdated);
  f.add(settings.data, 'dirLightX').min(-1.01).max(1.01).listen().name("Dir pos X").onChange(lightsUpdated);
  f.add(settings.data, 'dirLightY').min(0).max(1.01).listen().name("Dir pos Y").onChange(lightsUpdated);
  f.add(settings.data, 'dirLightZ').min(-1.01).max(1.01).listen().name("Dir Pos Z").onChange(lightsUpdated);
  f.addColor(settings.data, 'hemisphereLightSkyColor').name("Hemisphere Sky").onChange(lightsUpdated);
  f.addColor(settings.data, 'hemisphereLightGroundColor').name("Hemisphere Ground").onChange(lightsUpdated);
  f.add(settings.data, 'hemisphereLightIntensity').min(0).max(2).name("Hemisphere").onChange(lightsUpdated);

  if( initParams.isNetwork ){
    f = gui.addFolder('Networking');
    f.add(settings.data, 'keepAliveInterval').min(16).max(1000).name('Keep Alive Interval (ms)');
    f.add(settings.data, 'sendRate').min(1).max(60).name("Send Rate (hz)");

    f = gui.addFolder('Interpolation');
    f.add(settings.data, 'interpolationMaxFrames').min(0).max(120).name('Max frames (0=none)');
    f.add(settings.data, 'interpolationMaxDistance').min(0).max(1000).name('Max distance diff (px/frame)');
    f.add(settings.data, 'interpolationMinDistance').min(0).max(1000).name('Min distance diff (px/frame)');
  }

  gui.close();

}

settings.getSpawnlist = function(){
  var list = [];
  for (var key in settings.data.spawnExtras) {

    if(settings.data.spawnExtras[key]) list.push({id: key});

  }
  return list;
}

settings.changeTheme = function(theme){
  for( var key in theme ) {
    if( settings.theme.hasOwnProperty(key) ){
      settings.theme[key] = theme[key];
    }
  }

  if( gui ) {
    for (var i in gui.__folders["Theme"].__controllers) {
      gui.__folders["Theme"].__controllers[i].updateDisplay();
    }
  }

  settings.emit('colorsUpdated');

}


settings.createForrest = function() {
  settings.data.forrestPredefined = false;
  settings.emit('generateForrest');
}

settings.toggleInfo = function(){
  $("#debug-info").toggle()
}

settings.shortcut = function(label){
  keys.trigger(label.toLowerCase());
  //settings.emit("shortcutTrigged",label)
}

function setExtraStatus() {
  for (var key in extraRows) {
    var item = extraRows[key];

    if( !settings.data.overrideSpawnExtras ) {
      item.domElement.lastChild.disabled = true;
      item.domElement.parentNode.className="disabled";
    }
    else {
      item.domElement.lastChild.disabled = false;
      item.domElement.parentNode.className="";
    }
  }
}

function colorsUpdated() {
  settings.emit('colorsUpdated');
}


function lightsUpdated( value ) {
  settings.emit('lightsUpdated');
}

function mobileColor() {
  var filter = 'hue-rotate('+settings.data.hue+'deg) saturate('+settings.data.saturate+'%)';
  $('#canv-css .background')[0].style.webkitFilter = filter;
}

function mobileExtrasColor() {
  var filter = 'hue-rotate('+settings.data.extraHue+'deg) saturate('+settings.data.extraSaturate+'%)';
  $('#canv-css .extra').each( function(){
    this.style.webkitFilter = filter;
  })
}




