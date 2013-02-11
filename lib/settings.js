var audio = require('./audio')
  , Emitter = require('emitter')
  , world = require('./world')
  , $ = require('jquery');

var settings = exports;

Emitter(settings);

// the default theme
// to be overridden by levels
settings.theme = {

  /*treeTrunkColor: 0x1564a4,
  shieldColor: 0xffffff,
  puckColor: 0xefce06,
  arenaColor: 0x892419,
  terrainColor1: 0x4d87dc,
  terrainColor2: 0x1f84d5,
  terrainColor3: 0x195475,
  treeBranchColor: 0x1564a4,
  iconColor: 0xefce06,
  gridBrightness:1.0*/

  treeTrunkColor: 0x206cc3,
  shieldColor: 0xffffff,
  puckColor: 0xefce06,
  arenaColor: 0xeb2020,
  terrainColor1: 0x146ccf,
  terrainColor2: 0x0a71b9,
  terrainColor3: 0x196189,
  treeBranchColor: 0x206cc3,
  iconColor: 0xefce06,
  gridBrightness:0.1

}

settings.changeTheme = function(theme){
  settings.theme = theme;
  settings.emit('colorsUpdated');
}

settings.data = {

  //temp
  debugFireball:false,
  debugGhostball:false,

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
  music: false,
  sounds: true,
  pointerLock: false,
  pointer: null,

  // info
  frame: 0,
  speed: 0.000001,

  fireColor: 0xefce06,
  fireColor2: 0xff0000,

  //ambientLightColor: 0x444444,
  //ambientLightIntensity: 0.40,
  dirLightColor: 0xffffff,
  dirLightIntensity: 0.83,
  dirLightX: 0,
  dirLightZ: 0.33,
  hemisphereLightSkyColor: 0xffffff,
  hemisphereLightGroundColor: 0xb1b1b1,
  hemisphereLightIntensity:0.74,
  pointLightColor: 0xffffff,
  pointLightIntensity: 0.6,

  useShadows:false,
  puckRadius: 40,
  arenaSurfaceY: -200,

  // networking
  countdown: 1000,

  // controls
  mouseSensitivity: .3,
  keyboardSensitivity: .6,
  invertControls: false
}

createGenericUI()

lightsUpdated()

function createGenericUI() {
  // dat.GUI is global, included in the HTML
  var gui = settings.gui = new dat.GUI({ autoPlace: false });
  gui.width = 332;
  document.getElementById("settingsDataGUI").appendChild(gui.domElement);

 //stats
  //document.getElementById("statsDebug").appendChild(settings.stats.domElement);


   var f = gui.addFolder('theme');
    f.addColor(settings.theme, 'shieldColor').name("Shield hit").onChange(colorsUpdated);
    f.addColor(settings.theme, 'puckColor').name("Puck").onChange(colorsUpdated);
    f.addColor(settings.theme, 'arenaColor').name("Arena").onChange(colorsUpdated);
    f.addColor(settings.theme, 'terrainColor1').name("Terrain1").onChange(colorsUpdated);
    f.addColor(settings.theme, 'terrainColor2').name("Terrain2").onChange(colorsUpdated);
    f.addColor(settings.theme, 'terrainColor3').name("Terrain3").onChange(colorsUpdated);
    f.addColor(settings.theme, 'treeBranchColor').name("Trees").onChange(colorsUpdated);
    f.addColor(settings.theme, 'iconColor').name("Icons").onChange(colorsUpdated);
    f.add(settings.theme, 'gridBrightness').min(0).max(1).name("Grid brightness").onChange(colorsUpdated);

  f = gui.addFolder('Game settings');
  f.add(settings.data, 'showDebugInfo').name("show debug panel").onChange(function(value){
    $("#debug-info").toggle(value);
  });

  f.add(settings.data, 'paused').name('Game Paused');
  f.add(settings.data, 'fpsCamera').name('FPS Camera').onChange( function(){settings.emit('cameraTypeChanged')});
  f.add(settings.data, 'arenaWidth').min(400).name('Arena width');
  f.add(settings.data, 'arenaHeight').min(400).name('Arena length');

  f.add(settings.data, 'music').name("Music").onChange(function(value){
    if( value ) {
      audio.play("soundtrack");
    } else {
      audio.stop("soundtrack");
    }
  });

  f = gui.addFolder('Paddle settings');
  f.add(settings.data, 'paddleMass').min(0).max(1).name("Mass");
  f.add(settings.data, 'paddleDamping').min(0).max(1).name("Damping");
  f.add(settings.data, 'keyboardSensitivity').min(0).max(1).name("Keyboard Sensitivity");
  f.add(settings.data, 'mouseSensitivity').min(0).max(1).name("Mouse Sensitivity");

  f = gui.addFolder('Lights and colors');
  /*f.addColor(settings.data, 'ambientLightColor').name("Ambient color").onChange(lightsUpdated);
  f.add(settings.data, 'ambientLightIntensity').min(0).max(1).name("Ambient intensity").onChange(lightsUpdated);*/
  f.addColor(settings.data, 'dirLightColor').name("dir color").onChange(lightsUpdated);
  f.add(settings.data, 'dirLightIntensity').min(0).max(2).name("Dir intensity").onChange(lightsUpdated);
  f.add(settings.data, 'dirLightX').min(-1).max(1).listen().name("Dir pos X").onChange(lightsUpdated);
  f.add(settings.data, 'dirLightZ').min(-1).max(1).listen().name("Dir pos Z").onChange(lightsUpdated);
  f.addColor(settings.data, 'hemisphereLightSkyColor').name("Hemisphere sky color").onChange(lightsUpdated);
  f.addColor(settings.data, 'hemisphereLightGroundColor').name("Hemisphere ground color").onChange(lightsUpdated);
  f.add(settings.data, 'hemisphereLightIntensity').min(0).max(2).name("Hemisphere intensity").onChange(lightsUpdated);

  //f = gui.addFolder('Stats');
  //f.add(world, 'frame').name('Frame').listen();
  //f.add(world, 'collisions').name('Collisions').listen();



  gui.close();

  //ugly hack to change title of menu
  $("#settingsDataGUI").find(".close-button").click( function(){
    $(this).html("Global")
  }).html("Global");

//$("#settingsGUIContainer").hide()
}


function colorsUpdated() {
  settings.emit('colorsUpdated');
}


function lightsUpdated( value ) {
  settings.emit('lightsUpdated');
}

