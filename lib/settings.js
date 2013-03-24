var Emitter = require('emitter')
  , world = require('./world')
  , actions = require('./actions')
  , Themes = require('./themes')
  , $ = require('jquery');

var gui;

var settings = Emitter(exports);

// the default theme
// to be overridden by levels
settings.ai = null;
settings.theme = Themes.current;

var extraRows = [];

settings.data = {

  godMode:false,
  showDebugInfo: false,
  overrideCamera: "",
  fpsCamera: false,

  // game
  arenaWidth: 1700,
  arenaHeight: 1700/18*26,
  arenaColumns: 18,
  arenaRows: 26,
  unitSize: Math.round(1700/18),
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


//used for fun debugging
settings.addPuck = function(){
  settings.emit('addPuck');
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

settings.createGenericUI = function() {
  // dat.GUI is global, included in the HTML
  gui = new dat.GUI({ autoPlace: false });
  settings.gui = gui;

  gui.width = 332;
  document.getElementById("settingsDataGUI").appendChild(gui.domElement);

  var f;

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
  f.addColor(settings.theme, 'countdown1').name("Countdown bg1").onChange(colorsUpdated);
  f.addColor(settings.theme, 'countdown2').name("Countdown bg2").onChange(colorsUpdated);

  f = gui.addFolder('Game');
  f.add(settings.data, 'godMode').name('God mode');
  f.add(settings.data, 'speedupMomentum').name('Use paddle momentum');
  f.add(settings, 'addPuck').name('Add puck');



  f = gui.addFolder('Extras');
  f.add(settings.data,"overrideSpawnExtras").name("override extras spawn").onChange(setExtraStatus);

  for (var key in settings.data.spawnExtras) {
    var item = f.add(settings.data.spawnExtras,key).name(key);
    extraRows[key] = item;
  }

  setExtraStatus()

  f = gui.addFolder('Paddle');
  f.add(settings.data, 'paddleMass').min(0).max(1).name("Mass");
  f.add(settings.data, 'paddleDamping').min(0).max(1).name("Damping");
  f.add(settings.data, 'keyboardSensitivity').min(0).max(1).name("Keyboard Sensitivity");
  f.add(settings.data, 'mouseSensitivity').min(0).max(1).name("Mouse/Touch sensitivity");

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

