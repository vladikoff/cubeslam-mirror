/* global dat: true, _gaq: true */

var settings = require('./settings')
  , Themes = require('./themes')
  , keys = require('mousetrap')
  , $ = require('jquery');

var gui
  , extraRows = [];

var CAMERA_TYPES = {
  'Scripted (1)': 0,
  'FPS (2)': 1,
  'Classic (3)': 2,
  'Rabbit Cam (4)': 3,
  'Mountain View (5)': 4
}

exports.createGenericUI = function( initParams ) {
  // dat.GUI is global, included in the HTML
  gui = new dat.GUI({ autoPlace: false });
  settings.gui = gui;

  gui.width = 400;
  document.getElementById('settingsDataGUI').appendChild(gui.domElement);

  gui.domElement.addEventListener('click', logSettingsClick)

  function logSettingsClick(){
    gui.domElement.removeEventListener('click', logSettingsClick)
    _gaq.push(['_trackEvent', 'settings', 'open']);
  }

  var f;

  f = gui.addFolder('Generic');
  f.add(exports,'shortcut','O').name('Show panels')
  f.add(exports,'shortcut','0').name('Debug renderer')
  f.add(exports,'shortcut','P').name('Add puck');
  f.add(exports,'shortcut','E').name('Explode');
  f.add(exports,'shortcut','H').name('Heal');
  f.add(exports,'shortcut','M').name('Mirror effect');
  f.add(settings.data, 'godMode').name('God mode');
  f.add(settings.data, 'quality',{'Best quality (antialiasing)':'best','High quality':'high','High performance':'low','Mobile':'mobile'}).onChange(function(value){

    var result=confirm('The page needs to be reloaded for the setting to be activated');
    if (result===true) {
      var currentUrl = window.location.href;
      currentUrl = updateQueryStringParameter(currentUrl,'quality',value);
      window.location.href = currentUrl;
    }
    /*
    settings.data.quality = value;
    settings.emit('qualityChanged');*/
  }.bind(this));
  f.add(settings.data, 'framerate').min(1).max(120).name('Framerate (fps)').onChange(framerateUpdated)
  f.add(settings.data, 'unitSpeed').min(1).max(120).name('Speed')

  f = gui.addFolder('Camera');
  f.add(settings.data, 'cameraType',CAMERA_TYPES).name('Mode').listen().onChange(function(value){
    settings.data.cameraType = parseInt(value,10);
    settings.emit('cameraTypeChanged')
  }.bind(this));
  f.add(settings.data,'cameraOverlay').name('Overlay').onChange(function(){
    settings.emit('cameraSettingsChanged')
  }.bind(this))
  f.add(settings.data,'cameraFov').min(10).max(100).step(1).name('FOV').onChange(function(){
    settings.emit('cameraSettingsChanged')
  }.bind(this))
  f.add(settings.data,'cameraGrid').min(0).max(1).name('Scanlines').onChange(function(){
    settings.emit('cameraSettingsChanged')
  }.bind(this))
  f.add(exports, 'shortcut','C').name('Log position');


  f = gui.addFolder('Theme');

  f.add(settings.data,'wireframeOverride').name('Wireframe override').onChange(function(){
    settings.emit('wireframeOverrideChanged')
  }.bind(this))
  f.add(settings.data,'terrainNormals').name('Terrain normals').onChange(function(){
    settings.emit('terrainNormalsChanged')
  }.bind(this))

  this.themelist = {};
  for (var i = Themes.list.length - 1; i >= 0; i--) {
    this.themelist[Themes.list[i].name] = i
  }

  f.add(this,'themelist',this.themelist).name('Presets').onChange(function(value){
    Themes.goto(parseInt(value,10)-1);
  })

  f.addColor(settings.theme, 'shieldColor').name('Shield color').onChange(colorsUpdated);
  f.addColor(settings.theme, 'puckColor').name('Puck').onChange(colorsUpdated);
  f.addColor(settings.theme, 'arenaColor').name('Arena').onChange(colorsUpdated);
  f.addColor(settings.theme, 'terrainColor1').name('Terrain1').onChange(colorsUpdated);
  f.addColor(settings.theme, 'terrainColor2').name('Terrain2').onChange(colorsUpdated);
  f.addColor(settings.theme, 'terrainColor3').name('Terrain3').onChange(colorsUpdated);
  f.addColor(settings.theme, 'treeBranchColor').name('Trees').onChange(colorsUpdated);
  f.addColor(settings.theme, 'iconColor').name('Icons').onChange(colorsUpdated);
  f.addColor(settings.theme, 'cpuBackdropColor').name('CPU backdrop').onChange(colorsUpdated);
  f.add(settings.theme, 'gridBrightness').min(0).max(1).name('Grid brightness').onChange(colorsUpdated);


  if( initParams.isMobile ) {
    f = gui.addFolder('Mobile Colors');
    f.add(settings.data, 'hue').min(0).max(360).name('Hue').onChange(mobileColor);
    f.add(settings.data, 'saturate').min(0).max(100).name('Saturate').onChange(mobileColor);
    f.add(settings.data, 'extraHue').min(0).max(360).name('Extras Hue').onChange(mobileExtrasColor);
    f.add(settings.data, 'extraSaturate').min(0).max(100).name('Extras Saturate').onChange(mobileExtrasColor);
  }

  f = gui.addFolder('Extras');
  f.add(settings.data,'overrideSpawnExtras').name('override extras').onChange(setExtraStatus);
  for (var key in settings.data.spawnExtras) {
    extraRows[key] = f.add(settings.data.spawnExtras,key).name(key);
  }
  setExtraStatus()

  f = gui.addFolder('Paddle');
  f.add(settings.data, 'paddleMomentum').name('Use momentum');
  f.add(settings.data, 'speedupMomentum').name('Momentum speedup');
  f.add(settings.data, 'directionMomentum').name('Momentum direction');
  f.add(settings.data, 'paddleMass').min(0).max(1).name('Mass');
  f.add(settings.data, 'paddleDamping').min(0).max(1).name('Damping');
  f.add(settings.data, 'keyboardSensitivity').min(0).max(100).name('Keyboard Sens.');
  f.add(settings.data, 'mouseSensitivity').min(0).max(100).name('Mouse/Touch Sens.');

  f = gui.addFolder('Forest');
  f.add(settings.data, 'forrestThreshold').min(0).max(1).name('Amount');
  f.add(settings.data, 'forrestGridX').min(50).max(500).name('Grid Size X');
  f.add(settings.data, 'forrestGridY').min(50).max(500).name('Grid Size Y');
  f.add(settings.data, 'forrestBaseScale').min(0).max(3).name('Base Scale');
  f.add(settings.data, 'forrestRandomSeed').min(0).max(10).name('Groups/Random');
  f.add(exports, 'createForrest').name('Generate');

  f = gui.addFolder('Lights');
  f.addColor(settings.data, 'dirLightColor').name('Dir color').onChange(lightsUpdated);
  f.add(settings.data, 'dirLightIntensity').min(0).max(2).name('Dir').onChange(lightsUpdated);
  f.add(settings.data, 'dirLightX').min(-1.01).max(1.01).listen().name('Dir pos X').onChange(lightsUpdated);
  f.add(settings.data, 'dirLightY').min(0).max(1.01).listen().name('Dir pos Y').onChange(lightsUpdated);
  f.add(settings.data, 'dirLightZ').min(-1.01).max(1.01).listen().name('Dir Pos Z').onChange(lightsUpdated);
  f.addColor(settings.data, 'hemisphereLightSkyColor').name('Hemisphere Sky').onChange(lightsUpdated);
  f.addColor(settings.data, 'hemisphereLightGroundColor').name('Hemisphere Ground').onChange(lightsUpdated);
  f.add(settings.data, 'hemisphereLightIntensity').min(0).max(2).name('Hemisphere').onChange(lightsUpdated);

  if( initParams.isNetwork ){
    f = gui.addFolder('Networking');
    f.add(settings.data, 'keepAliveInterval').min(16).max(1000).name('Keep Alive Interval (ms)');
    f.add(settings.data, 'sendRate').min(1).max(60).name('Send Rate (hz)');

    f = gui.addFolder('Interpolation');
    f.add(settings.data, 'interpolationMaxFrames').min(0).max(120).name('Max frames (0=none)');
    f.add(settings.data, 'interpolationMaxDistance').min(0).max(1000).name('Max distance diff (px/frame)');
    f.add(settings.data, 'interpolationMinDistance').min(0).max(1000).name('Min distance diff (px/frame)');
  }

  gui.close();

  settings.on('colorsUpdated',function(){
    for (var i in gui.__folders['Theme'].__controllers) {
      gui.__folders['Theme'].__controllers[i].updateDisplay();
    }
  })
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

function framerateUpdated(v){
  settings.data.timestep = 1000/v;
}

function setExtraStatus() {
  for (var key in extraRows) {
    var item = extraRows[key];

    if( !settings.data.overrideSpawnExtras ) {
      item.domElement.lastChild.disabled = true;
      item.domElement.parentNode.className='disabled';
    }
    else {
      item.domElement.lastChild.disabled = false;
      item.domElement.parentNode.className='';
    }
  }
}

function updateQueryStringParameter(uri, key, value) {
  var re = new RegExp("([?|&])" + key + "=.*?(&|$)", "i");
  separator = uri.indexOf('?') !== -1 ? "&" : "?";
  if (uri.match(re)) {
    return uri.replace(re, '$1' + key + "=" + value + '$2');
  }
  else {
    return uri + separator + key + "=" + value;
  }
}

exports.createForrest = function() {
  settings.data.forrestPredefined = false;
  settings.emit('generateForrest');
}

exports.shortcut = function(label){
  keys.trigger(label.toLowerCase());
}

