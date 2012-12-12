var audio = require('./audio')
  , Emitter = require('emitter')
  , world = require('./world')
  , $ = require('jquery');

var settings = exports;

Emitter(settings);

// the default theme
// to be overridden by levels
settings.theme = {
  shieldColor: 0xffffff,
  arenaColor: 0xaa1000,
  puckColor: 0xefce06,
  terrainColor1: 0x4d87dc,
  terrainColor2: 0x1f84d5,
  terrainColor3: 0x195475,
  treeBranchColor: 0x1564a4,
  treeTrunkColor: 0x1564a4
}

settings.changeTheme = function(theme){
  settings.theme = theme;
  settings.emit('colorsUpdated');
}

// settings.levelData =
// {
//   "remembered": {
//     "Default": {
//       "0": {
//         "ballMaxSpeed": 10
//       },
//       "1": {
//         "shieldColor": 16777215,
//         "puckColor": 15715846,
//         "arenaColor": 11145216,
//         "terrainColor1": 5081052,
//         "terrainColor2": 2065621,
//         "terrainColor3": 1660021,
//         "treeBranchColor": 1402020
//       }
//     },
//     "level1": {
//       "0": {
//         "ballMaxSpeed": 10
//       },
//       "1": {
//         "shieldColor": 16777215,
//         "puckColor": 15715846,
//         "arenaColor": 0x892419,
//         "terrainColor1": 5081052,
//         "terrainColor2": 2065621,
//         "terrainColor3": 1660021,
//         "treeBranchColor": 1402020
//       }
//     },
//     "level2": {
//       "0": {
//         "ballMaxSpeed": 10
//       },
//       "1": {
//         "shieldColor": 16777215,
//         "puckColor": 15715846,
//         "arenaColor": 3437519,
//         "terrainColor1": 5674547,
//         "terrainColor2": 4558365,
//         "terrainColor3": 4822547,
//         "treeBranchColor": 4296982
//       }
//     },
//     "level VIT": {
//       "0": {
//         "ballMaxSpeed": 10
//       },
//       "1": {
//         "shieldColor": 16777215,
//         "puckColor": 15715846,
//         "arenaColor": 6714485,
//         "terrainColor1": 14934989,
//         "terrainColor2": 15131078,
//         "terrainColor3": 14145467,
//         "treeBranchColor": 14802639
//       }
//     },
//     "LEVEL GREEN": {
//       "0": {
//         "ballMaxSpeed": 10
//       },
//       "1": {
//         "shieldColor": 16777215,
//         "puckColor": 15715846,
//         "arenaColor": 4693302,
//         "terrainColor1": 3369162,
//         "terrainColor2": 1399980,
//         "terrainColor3": 2249624,
//         "treeBranchColor": 1338555
//       }
//     },
//     "LEVEL BLACK": {
//       "0": {
//         "ballMaxSpeed": 10
//       },
//       "1": {
//         "shieldColor": 16777215,
//         "puckColor": 15715846,
//         "arenaColor": 1250068,
//         "terrainColor1": 3618615,
//         "terrainColor2": 2829357,
//         "terrainColor3": 2368808,
//         "treeBranchColor": 3422268
//       }
//     },
//     "Level Orange": {
//       "0": {
//         "ballMaxSpeed": 10
//       },
//       "1": {
//         "shieldColor": 15259350,
//         "puckColor": 15790303,
//         "arenaColor": 12477202,
//         "terrainColor1": 1218007,
//         "terrainColor2": 2327523,
//         "terrainColor3": 5723991,
//         "treeBranchColor": 3642849
//       }
//     },
//     "Level Yellow": {
//       "0": {
//         "ballMaxSpeed": 10
//       },
//       "1": {
//         "shieldColor": 16777215,
//         "puckColor": 15715846,
//         "arenaColor": 394764,
//         "terrainColor1": 3028547,
//         "terrainColor2": 2243149,
//         "terrainColor3": 14082536,
//         "treeBranchColor": 2763306
//       }
//     },
//     "Level 8": {
//       "0": {
//         "ballMaxSpeed": 10
//       },
//       "1": {
//         "shieldColor": 16777215,
//         "puckColor": 15715846,
//         "arenaColor": 2896930,
//         "terrainColor1": 5732410,
//         "terrainColor2": 5271598,
//         "terrainColor3": 5466917,
//         "treeBranchColor": 5333290
//       }
//     }
//   },
//   "preset": "level VIT",
//   "closed": false,
//   "folders": {
//     "theme": {
//       "preset": "Default",
//       "closed": false,
//       "folders": {}
//     }
//   }
// }


settings.data = {

    showDebugInfo: false,

    // game
    inputType: "keyboard",
    arenaWidth: 1700,
    arenaHeight: 2200,
    arenaSideHeight: 200,
    paddleDepth:100,
    videoBoxDepth:700,
    paused: false,
    reversed: false,
    renderer: "3d",
    maxHits: 10,
    keyboardSpeedMax: 31,
    keyboardAccelerate: 0.95,
    keyboardDamping: 0.76,
    music: false,
    sounds: true,

    // info
    frame: 0,
    speed: 0.000001,

    // motion tracking
    useMotionTracking:true,
    trackingColorPreBlur: 20,
    trackingColor: [102,24,37],
    trackingColorPreview: [102,24,37],
    trackingColorThreshold: 0.32,
    trackingColorAutoThreshold: true,
    trackingColorBlur: 20-1.6,
    trackingColorBlurThreshold: 0.1,
    motionBlur:20-3,
    motionThreshold:0.03,
    pointSmoothing:10,

    //ambientLightColor: 0x444444,
    //ambientLightIntensity: 0.40,
    dirLightColor: 0xffffff,
    dirLightIntensity: 0.63 ,
    hemisphereLightSkyColor: 0xffffff,
    hemisphereLightGroundColor: 0xb1b1b1,
    hemisphereLightIntensity:1,
    pointLightColor: 0xffffff,
    pointLightIntensity: 0.6,

    useShadows:false,
    usePost:true,
    puckRadius: 20,
    arenaSurfaceY: -200,
    arenaColumns: 18,

    // networking
    countdown: 1000
}

createGenericUI()

lightsUpdated()

function createGenericUI() {
  // dat.GUI is global, included in the HTML
  var gui = settings.gui = new dat.GUI({ autoPlace: false });
  gui.width = 332;
  document.getElementById("settingsDataGUI").appendChild(gui.domElement);

 //stats
  settings.stats = new Stats();
  //document.getElementById("statsDebug").appendChild(settings.stats.domElement);

  var f;

  f = gui.addFolder('Game settings');
  f.add(settings.data, 'showDebugInfo').name("show debug panel").onChange(function(value){
    $("#debug-info").toggle(value);
  });

  f.add(settings.data, 'paused').name('Game Paused');
  f.add(settings.data, 'arenaWidth').min(400).name('Arena width');
  f.add(settings.data, 'arenaHeight').min(400).name('Arena length');
  f.add(settings.data, 'inputType').options("mouse","keyboard").name("Input Type").listen();
  f.add(settings.data, 'keyboardSpeedMax').min(1).max(40).name("Keyboard speed");
  f.add(settings.data, 'keyboardAccelerate').min(0).max(1).name("Keyboard acc");
  f.add(settings.data, 'keyboardDamping').min(0).max(1).name("Keyboard damping");
  f.add(settings.data, 'usePost').name("use post processing");


  f.add(settings.data, 'music').name("Play soundtrack").onChange(function(value){
    if( value ) {
      audio.play("soundtrack");
    } else {
      audio.stop("soundtrack");
    }
  });

  //stats
  settings.stats = new Stats();
  //document.getElementById("statsDebug").appendChild(settings.stats.domElement);

  f = gui.addFolder('Lights and colors');
  /*f.addColor(settings.data, 'ambientLightColor').name("Ambient color").onChange(lightsUpdated);
  f.add(settings.data, 'ambientLightIntensity').min(0).max(1).name("Ambient intensity").onChange(lightsUpdated);*/
  f.addColor(settings.data, 'dirLightColor').name("dir color").onChange(lightsUpdated);
  f.add(settings.data, 'dirLightIntensity').min(0).max(2).name("Dir intensity").onChange(lightsUpdated);
  f.addColor(settings.data, 'hemisphereLightSkyColor').name("Hemisphere sky color").onChange(lightsUpdated);
  f.addColor(settings.data, 'hemisphereLightGroundColor').name("Hemisphere ground color").onChange(lightsUpdated);
  f.add(settings.data, 'hemisphereLightIntensity').min(0).max(2).name("Hemisphere intensity").onChange(lightsUpdated);

  f = gui.addFolder('Stats');
  f.add(world, 'frame').name('Frame').listen();
  f.add(world, 'collisions').name('Collisions').listen();

  gui.close();

  //ugly hack to change title of menu
  $("#settingsDataGUI").find(".close-button").click( function(){
    $(this).html("Global")
  }).html("Global");

//$("#settingsGUIContainer").hide()
}

function lightsUpdated( value ) {
  settings.emit('lightsUpdated');
}

