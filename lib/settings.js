var audio = require('./audio'),
    Emitter = require('emitter'),
    world = require('./world');

var settings = exports;

settings.emitter = Emitter({});

settings.level = {
    ballMaxSpeed: 10,
    
    theme: {
        shieldColor: 0xffffff,
        arenaColor: 0xaa1000,
        puckColor: 0xefce06,
        terrainColor1: 0x4d87dc,
        terrainColor2: 0x1f84d5,
        terrainColor3: 0x195475,
        treeBranchColor: 0x1564a4,
        treeTrunkColor: 0x1564a4
    }
}

    
settings.levelData =
{
  "remembered": {
    "Default": {
      "0": {
        "ballMaxSpeed": 10
      },
      "1": {
        "shieldColor": 16777215,
        "puckColor": 15715846,
        "arenaColor": 11145216,
        "terrainColor1": 5081052,
        "terrainColor2": 2065621,
        "terrainColor3": 1660021,
        "treeBranchColor": 1402020
      }
    },
    "level1": {
      "0": {
        "ballMaxSpeed": 10
      },
      "1": {
        "shieldColor": 16777215,
        "puckColor": 15715846,
        "arenaColor": 12463148,
        "terrainColor1": 3374054,
        "terrainColor2": 1407434,
        "terrainColor3": 2584018,
        "treeBranchColor": 3633369
      }
    },
    "level2": {
      "0": {
        "ballMaxSpeed": 10
      },
      "1": {
        "shieldColor": 16777215,
        "puckColor": 15715846,
        "arenaColor": 3437519,
        "terrainColor1": 5674547,
        "terrainColor2": 4558365,
        "terrainColor3": 4822547,
        "treeBranchColor": 4296982
      }
    },
    "level VIT": {
      "0": {
        "ballMaxSpeed": 10
      },
      "1": {
        "shieldColor": 16777215,
        "puckColor": 15715846,
        "arenaColor": 6714485,
        "terrainColor1": 14934989,
        "terrainColor2": 15131078,
        "terrainColor3": 14145467,
        "treeBranchColor": 14802639
      }
    },
    "LEVEL GREEN": {
      "0": {
        "ballMaxSpeed": 10
      },
      "1": {
        "shieldColor": 16777215,
        "puckColor": 15715846,
        "arenaColor": 4693302,
        "terrainColor1": 3369162,
        "terrainColor2": 1399980,
        "terrainColor3": 2249624,
        "treeBranchColor": 1338555
      }
    },
    "LEVEL BLACK": {
      "0": {
        "ballMaxSpeed": 10
      },
      "1": {
        "shieldColor": 16777215,
        "puckColor": 15715846,
        "arenaColor": 1250068,
        "terrainColor1": 3618615,
        "terrainColor2": 2829357,
        "terrainColor3": 2368808,
        "treeBranchColor": 3422268
      }
    },
    "Level Orange": {
      "0": {
        "ballMaxSpeed": 10
      },
      "1": {
        "shieldColor": 15259350,
        "puckColor": 15790303,
        "arenaColor": 12477202,
        "terrainColor1": 1218007,
        "terrainColor2": 2327523,
        "terrainColor3": 5723991,
        "treeBranchColor": 3642849
      }
    },
    "Level Yellow": {
      "0": {
        "ballMaxSpeed": 10
      },
      "1": {
        "shieldColor": 16777215,
        "puckColor": 15715846,
        "arenaColor": 6247213,
        "terrainColor1": 5732410,
        "terrainColor2": 3957776,
        "terrainColor3": 5468189,
        "treeBranchColor": 5333290
      }
    },
    "Level 8": {
      "0": {
        "ballMaxSpeed": 10
      },
      "1": {
        "shieldColor": 16777215,
        "puckColor": 15715846,
        "arenaColor": 2896930,
        "terrainColor1": 5732410,
        "terrainColor2": 5271598,
        "terrainColor3": 5466917,
        "treeBranchColor": 5333290
      }
    }
  },
  "preset": "level VIT",
  "closed": false,
  "folders": {
    "theme": {
      "preset": "Default",
      "closed": false,
      "folders": {}
    }
  }
}

settings.data = {

    showDebugInfo: true,

    // game
    inputType: "keyboard",
    arenaWidth: 1700,
    arenaHeight: 2200,
    arenaSideHeight: 150,
    paddleDepth:100,
    videoBoxDepth:700,
    paused: false,
    reversed: false,
    renderer: "3d",
    maxHits: 3,
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

    dirLightColor: 0xffffff,
    dirLightIntensity: 0.80 ,
    hemisphereLightSkyColor: 0xffffff,
    hemisphereLightGroundColor: 0x000000,
    hemisphereLightIntensity:0.8,
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
createLevelUI()
lightsUpdated();

function createGenericUI() {
    // dat.GUI is global, included in the HTML
    var gui = settings.gui = new dat.GUI({ autoPlace: false });
    gui.width = 332;

    document.getElementById("settingsDataGUI").appendChild(gui.domElement);

    /*var newItem = $("<li class='cr boolean ui_video'></li>");
    newItem.first().append($("#uiTopContent"));

    var $target = $(".dg").find("ul").first().prepend( newItem );
*/
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
   
    /*f = gui.addFolder('Tracking settings');
    f.add(settings.data, 'pointSmoothing').min(1).max(20).name("Smoothing");
    f.add(settings.data, 'useMotionTracking').name("Use motion tracking");
    f.add(settings.data, 'motionThreshold').min(0).max(1).name("threshold");

    f = gui.addFolder('Tracking color');
    f.add(settings.data, 'trackingColorPreBlur').min(0.1).max(20).name('pre blur');
    f.addColor(settings.data, 'trackingColor').name("color").listen();
    f.add(settings.data, 'trackingColorThreshold').min(0).max(1).name("threshold").listen();
    f.add(settings.data, 'trackingColorAutoThreshold').name("auto threshold");
*/

    f = gui.addFolder('Lights and colors');
    f.addColor(settings.data, 'dirLightColor').name("dir color").onChange(lightsUpdated);
    f.add(settings.data, 'dirLightIntensity').min(0).max(1).name("Dir intensity").onChange(lightsUpdated);
    f.addColor(settings.data, 'hemisphereLightSkyColor').name("Hemisphere sky color").onChange(lightsUpdated);
    f.addColor(settings.data, 'hemisphereLightGroundColor').name("Hemisphere ground color").onChange(lightsUpdated);
    f.add(settings.data, 'hemisphereLightIntensity').min(0).max(1).name("Hemisphere intensity").onChange(lightsUpdated);
    //f.addColor(settings.data, 'pointLightColor').name("point color").onChange(lightsUpdated);
    //f.add(settings.data, 'pointLightIntensity').min(0).max(3).name("point intensity").onChange(lightsUpdated);

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

function createLevelUI() {
    // dat.GUI is global, included in the HTML
    var gui = settings.level.themeGUI = new dat.GUI({ load: settings.levelData, autoPlace: false });
    gui.width = 332;

    gui.remember(settings.level,settings.level.theme);

    document.getElementById("settingsLevelsGUI").appendChild(gui.domElement);
    
    var f;

    gui.add(settings.level, 'ballMaxSpeed').min(1).max(20);

    f = gui.addFolder('theme');
    f.addColor(settings.level.theme, 'shieldColor').name("Shield hit").onChange(colorsUpdated);
    f.addColor(settings.level.theme, 'puckColor').name("Puck").onChange(colorsUpdated);
    f.addColor(settings.level.theme, 'arenaColor').name("Arena").onChange(colorsUpdated);
    f.addColor(settings.level.theme, 'terrainColor1').name("Terrain1").onChange(colorsUpdated);
    f.addColor(settings.level.theme, 'terrainColor2').name("Terrain2").onChange(colorsUpdated);
    f.addColor(settings.level.theme, 'terrainColor3').name("Terrain3").onChange(colorsUpdated);
    f.addColor(settings.level.theme, 'treeBranchColor').name("Trees").onChange(colorsUpdated);
    //f.addColor(settings.level.theme, 'treeTrunkColor').name("Tree trunks").onChange(colorsUpdated);

    gui.add(world,"reset").name("Restart level");


    gui.close();

    $("#settingsLevelsGUI").find(".close-button").click( function(){ 
        $(this).html("Levels")
    }).html("Levels");

//$("#settingsGUIContainer").hide()
}

function colorsUpdated( value) {
    settings.emitter.emit('colorsUpdated');
}

function lightsUpdated( value ) {
    settings.emitter.emit('lightsUpdated');
}

