var Emitter = require('emitter')
  , world = require('./world')
  , Geometry = require('./geometry')
  , Themes = require('./renderer-3d/themes')
  , $ = require('jquery');

var gui;

var settings = Emitter(exports);

// the default theme
// to be overridden by levels
settings.theme = Themes.current;

settings.data = {


  showDebugInfo: false,
  overrideCamera: "",
  fpsCamera: false,

  // game
  arenaWidth: 1700,
  arenaHeight: 1700/18*26,
  arenaColumns: 18,
  arenaRows: 26,
  unitSize: 1700/18,
  unitSpeed: 20,
  arenaSideHeight: 200,
  shieldPadding:2,
  defaultShields: 3,
  videoBoxDepth:700,
  paused: false,
  reversed: false,
  renderer: "3d",
  maxHits: 10,
  paddleMass: .8,
  paddleDamping: 0.8,

  // minimum Y velocity of puck
  minYSpeed: 10,

  // the interval on which the forces
  // will toggle between active/inactive
  // set to 0 or non-number to disable.
  forcesInterval: 5000,

  // special "speedup" which is damped
  // until it goes back to the normal
  // speed.
  speedupMomentum: true,

  // info
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

  overrideSpawnExtras:false,
  spawnExtras: {},
  testCPUMorph:-1,

  // networking
  countdown: 1000,

  // controls
  mouseSensitivity: .3,
  keyboardSensitivity: .9,
  invertControls: false
}


lightsUpdated()

settings.createGenericUI = function() {
  // dat.GUI is global, included in the HTML
  gui = new dat.GUI({ autoPlace: false });
  gui.width = 332;
  document.getElementById("settingsDataGUI").appendChild(gui.domElement);

  var f;

  f = gui.addFolder('Theme');
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

  f = gui.addFolder('Game settings');
  f.add(settings.data, 'showDebugInfo').name("show debug panel").onChange(function(value){
    $("#debug-info").toggle(value);
  });

  f.add(settings.data, 'speedupMomentum').name('SUPER PUCK');
  f.add(settings.data, 'paused').name('Game Paused');
  f.add(settings.data, 'fpsCamera').name('FPS Camera').onChange( function(){settings.emit('cameraTypeChanged')});
  f.add(settings.data, 'arenaWidth').min(400).name('Arena width');
  f.add(settings.data, 'arenaHeight').min(400).name('Arena length');

  f.add(settings.data, 'testCPUMorph').min(-1).max(Geometry.cpu.morphTargets.length).step(1).name('CPU morph frame');

  f = gui.addFolder('Extras spawned');
  f.add(settings.data,"overrideSpawnExtras").name("override extras spawn")


  settings.data.spawnExtras['bulletproof'] = false
  settings.data.spawnExtras['mirrored controls'] = false
  settings.data.spawnExtras['fog'] = false
  settings.data.spawnExtras['extra life'] = false
  settings.data.spawnExtras['ghost ball'] = false
  settings.data.spawnExtras['fireball'] = false
  settings.data.spawnExtras['multiball'] = false
  //settings.data.spawnExtras['time bomb'] = false
  //settings.data.spawnExtras['laser'] = false
  settings.data.spawnExtras['death ball'] = false


  for (var key in settings.data.spawnExtras) {
    f.add(settings.data.spawnExtras,key).name(key);
  }

  f = gui.addFolder('Paddle settings');
  f.add(settings.data, 'paddleMass').min(0).max(1).name("Mass");
  f.add(settings.data, 'paddleDamping').min(0).max(1).name("Damping");
  f.add(settings.data, 'keyboardSensitivity').min(0).max(1).name("Keyboard Sensitivity");
  f.add(settings.data, 'mouseSensitivity').min(0).max(1).name("Mouse Sensitivity");

  f = gui.addFolder('Lights');
  f.addColor(settings.data, 'dirLightColor').name("dir color").onChange(lightsUpdated);
  f.add(settings.data, 'dirLightIntensity').min(0).max(2).name("Dir intensity").onChange(lightsUpdated);
  f.add(settings.data, 'dirLightX').min(-1.01).max(1.01).listen().name("Dir pos X").onChange(lightsUpdated);
  f.add(settings.data, 'dirLightY').min(0).max(1.01).listen().name("Dir pos Y").onChange(lightsUpdated);
  f.add(settings.data, 'dirLightZ').min(-1.01).max(1.01).listen().name("Dir pos Z").onChange(lightsUpdated);
  f.addColor(settings.data, 'hemisphereLightSkyColor').name("Hemisphere sky color").onChange(lightsUpdated);
  f.addColor(settings.data, 'hemisphereLightGroundColor').name("Hemisphere ground color").onChange(lightsUpdated);
  f.add(settings.data, 'hemisphereLightIntensity').min(0).max(2).name("Hemisphere intensity").onChange(lightsUpdated);
  gui.close();

  //ugly hack to change title of menu
  $("#settingsDataGUI").find(".close-button").click( function(){
    $(this).html("Global")
  }).html("Global");

}

settings.getSpawnlist = function(){
  var list = [];
  for (var key in settings.data.spawnExtras) {

    if(settings.data.spawnExtras[key]) list.push({id: key});

  }
  return list;
}

settings.changeTheme = function(theme){
  for( key in theme ) {
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


function colorsUpdated() {
  settings.emit('colorsUpdated');
}


function lightsUpdated( value ) {
  settings.emit('lightsUpdated');
}

