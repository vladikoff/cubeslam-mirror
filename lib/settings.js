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
        "arenaColor": 10297106,
        "terrainColor1": 5081052,
        "terrainColor2": 2065621,
        "terrainColor3": 1660021,
        "treeBranchColor": 1402020
      }
    },
    "level2": {
      "0": {
        "ballMaxSpeed": 10
      },
      "1": {
        "shieldColor": 16777215,
        "puckColor": 15715846,
        "arenaColor": 394764,
        "terrainColor1": 3028547,
        "terrainColor2": 2243149,
        "terrainColor3": 14082536,
        "treeBranchColor": 2763306
      }
    }
  },
  "preset": "level2",
  "closed": false,
  "folders": {
    "Colors": {
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
    paddleDepth:40,
    videoBoxDepth:700,
    paused: false,
    reversed: false,
    renderer: "3d",
    maxHits: 3,
    keyboardSpeedMax: 12,
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

    // rendering
    /*colorMap: {
        "Red":0xd42f1b,
        "Green":0x59c659,
        "Blue":0x114475,
        "Yellow":0xefce06,
        "black":0x000000
    },
    colorIds:0,
    colorIds2:0,
    arenaColor: 0xd42f1b,
    puckColor: 0xefce06,
    shieldColor: 0xffffff,*/
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

function createGenericUI() {
    // dat.GUI is global, included in the HTML
    var gui = settings.gui = new dat.GUI({ autoPlace: false });
    gui.width = 332;

    document.getElementById("settingsDataGUI").appendChild(gui.domElement);

    var newItem = $("<li class='cr boolean ui_video'></li>");
    newItem.first().append($("#uiTopContent"));

    var $target = $(".dg").find("ul").first().prepend( newItem );

    //stats
    settings.stats = new Stats();
    document.getElementById("statsDebug").appendChild(settings.stats.domElement);

    var f;

    f = gui.addFolder('Game settings');
    f.add(settings.data, 'showDebugInfo').name("show debug panel").onChange(function(value){
        $("#debug-info").toggle(value);
    });

    f.add(settings.data, 'paused').name('Game Paused');
    f.add(settings.data, 'arenaWidth').min(400).name('Arena width');
    f.add(settings.data, 'arenaHeight').min(400).name('Arena length');
    f.add(settings.data, 'inputType').options("mouse","motion","keyboard").name("Input Type").listen();
    f.add(settings.data, 'keyboardSpeedMax').min(1).max(40).name("Keyboard speed");

    f.add(settings.data, 'usePost').name("use post processing");

    f.add(settings.data, 'music').name("Play soundtrack").onChange(function(value){
        if( value ) {
            audio.play("soundtrack");
        } else {
            audio.stop("soundtrack");
        }
    });
    /*
    f.addColor(settings.data, 'arenaColor').name("Arena Color").listen();

    f.add(settings.data, 'colorIds').options("Blue","Green","Red","Yellow","Black").name("Arena colors").onChange(function(value){
        settings.level.theme.arenaColor = settings.data.colorMap[value];
    })
    f.addColor(settings.data, 'puckColor').name("Puck Color").listen();
    f.add(settings.data, 'colorIds2').options("Blue","Green","Red","Yellow","Black").name("Puck colors").onChange(function(value){
        settings.data.puckColor = settings.data.colorMap[value];
    })*/


    f = gui.addFolder('Tracking settings');
    f.add(settings.data, 'pointSmoothing').min(1).max(20).name("Smoothing");
    f.add(settings.data, 'useMotionTracking').name("Use motion tracking");
    f.add(settings.data, 'motionThreshold').min(0).max(1).name("threshold");

    f = gui.addFolder('Tracking color');
    f.add(settings.data, 'trackingColorPreBlur').min(0.1).max(20).name('pre blur');
    f.addColor(settings.data, 'trackingColor').name("color").listen();
    f.add(settings.data, 'trackingColorThreshold').min(0).max(1).name("threshold").listen();
    f.add(settings.data, 'trackingColorAutoThreshold').name("auto threshold");

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

    //stats
    
    var f;

    /*
    f.addColor(settings.data, 'arenaColor').name("Arena Color").listen();

    f.add(settings.data, 'colorIds').options("Blue","Green","Red","Yellow","Black").name("Arena colors").onChange(function(value){
        settings.level.theme.arenaColor = settings.data.colorMap[value];
    })
    f.addColor(settings.data, 'puckColor').name("Puck Color").listen();
    f.add(settings.data, 'colorIds2').options("Blue","Green","Red","Yellow","Black").name("Puck colors").onChange(function(value){
        settings.data.puckColor = settings.data.colorMap[value];
    })*/

    gui.add(settings.level, 'ballMaxSpeed').min(1).max(20);
    
   /* f = gui.addFolder('Obstacles');
    f.add(settings.level.theme, 'obstacleTypes');
    f.add(settings.level.theme, 'obstacleSpawnInTime');
    f.add(settings.level.theme, 'obstacleSpawnOutTime');

    f = gui.addFolder('Extras');
    f.add(settings.level.theme, 'extraTypes');
    f.add(settings.level.theme, 'extraSpawnInTime');
    f.add(settings.level.theme, 'extraSpawnOutTime');*/

    f = gui.addFolder('Colors');
    f.addColor(settings.level.theme, 'shieldColor').name("Shield hit").onChange(colorsUpdated);
    f.addColor(settings.level.theme, 'puckColor').name("Puck").onChange(colorsUpdated);
    f.addColor(settings.level.theme, 'arenaColor').name("Arena").onChange(colorsUpdated);
    f.addColor(settings.level.theme, 'terrainColor1').name("Terrain1").onChange(colorsUpdated);
    f.addColor(settings.level.theme, 'terrainColor2').name("Terrain2").onChange(colorsUpdated);
    f.addColor(settings.level.theme, 'terrainColor3').name("Terrain3").onChange(colorsUpdated);
    f.addColor(settings.level.theme, 'treeBranchColor').name("Trees").onChange(colorsUpdated);
    //f.addColor(settings.level.theme, 'treeTrunkColor').name("Tree trunks").onChange(colorsUpdated);

    gui.add(world,"reset").name("Restart level");
 /*
    extraTypes: "1,1,1,1",
    extraSpawnInTime: "1,12,24,38",
    extraSpawnOutTime: "5,17,30,48",

    obstacleTypes: "1,1,1,1",
    obstacleSpawnInTime: "1,12,24,38",
    obstacleSpawnOutTime: "5,17,30,48",
*/

    gui.close();

    $("#settingsLevelsGUI").find(".close-button").click( function(){ 
        $(this).html("Levels")
    }).html("Levels");

//$("#settingsGUIContainer").hide()
}

function colorsUpdated( value) {
    settings.emitter.emit('colorsUpdated');
}


