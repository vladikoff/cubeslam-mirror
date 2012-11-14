var audio = require('./audio');

var settings = exports;

settings.data = {

    // game
    inputType: "mouse",
    arenaWidth: 1500,
    arenaHeight: 2000,
    arenaSideHeight: 150,
    paddleDepth:40,
    videoBoxDepth:500,
    paused: false,
    reversed: false,
    renderer: "3d",
    
    // info
    frame: 0,
    speed: 0.000001,

    // motion tracking
    useMotionTracking:true,
    trackingColorPreBlur: 20,
    trackingColor: [102,24,37],
    trackingColorThreshold: 0.32,
    trackingColorAutoThreshold: true,
    trackingColorBlur: 20-1.6,
    trackingColorBlurThreshold: 0.1,
    motionBlur:20-3,
    motionThreshold:0.03,
    pointSmoothing:5,

    // rendering
    colorMap: {
        "Red":0xe72921,
        "Green":0x59c659,
        "Blue":0x114475,
        "Yellow":0xefce06
    },  
    colorIds:0,
    colorIds2:0,
    arenaColor: 0x387fc4,
    puckColor: 0xefce06,
    useShadows:false,
    playSoundtrack:false,
    puckRadius: 15,
    arenaSurfaceY: -200,
    arenaColumns: 18,

    // networking
    countdown: 1000
}

    
settings.extend = function ( obj ) {
    if (typeof obj == 'object') {
        for (var prop in obj) {

            if (obj.hasOwnProperty(prop)) {
                settings.data[prop] = obj[prop];
            }
        }
    }
};


//stats
settings.stats = new Stats();
settings.stats.domElement.style.position = 'absolute';
settings.stats.domElement.style.right = '10px';
settings.stats.domElement.style.top = '20px';
document.body.appendChild( settings.stats.domElement );


// dat.GUI is global, included in the HTML
var gui = new dat.GUI({ autoPlace: false });
gui.width = 332;

document.getElementById("settingsGUIContainer").appendChild(gui.domElement);

var f;

f = gui.addFolder('Game settings');
f.add(settings.data, 'arenaWidth').min(400).name('Arena width');
f.add(settings.data, 'arenaHeight').min(400).name('Arena length');
f.add(settings.data, 'inputType').options("mouse","motion").name("input type");
f.add(settings.data, 'useShadows').name("use real-time shadows");
f.add(settings.data, 'playSoundtrack').name("Play soundtrack").onChange(function(value){
    if( value ) {
      audio.play("soundtrack");  
    }
    else {
        audio.stop("soundtrack");
    }
});

f.addColor(settings.data, 'arenaColor').name("Arena Color").listen();

f.add(settings.data, 'colorIds').options("Blue","Green","Red","Yellow").name("Arena colors").onChange(function(value){
    settings.data.arenaColor = settings.data.colorMap[value];
})
f.addColor(settings.data, 'puckColor').name("Puck Color").listen();
f.add(settings.data, 'colorIds2').options("Blue","Green","Red","Yellow").name("Puck colors").onChange(function(value){
    settings.data.puckColor = settings.data.colorMap[value];
})


f = gui.addFolder('Tracking settings');
f.add(settings.data, 'pointSmoothing').min(1).max(20).name("Smoothing");
f.add(settings.data, 'useMotionTracking').name("Use motion tracking");
f.add(settings.data, 'motionThreshold').min(0).max(1).name("threshold");

f = gui.addFolder('Tracking color');
f.add(settings.data, 'trackingColorPreBlur').min(0.1).max(20).name('pre blur');
f.addColor(settings.data, 'trackingColor').name("color").listen();
f.add(settings.data, 'trackingColorThreshold').min(0).max(1).name("threshold").listen();
f.add(settings.data, 'trackingColorAutoThreshold').name("auto threshold");

f = gui.addFolder('Info');
f.add(settings.data, 'frame').name('Frame').listen();
f.add(settings.data, 'speed').name('Puck Speed').listen();
f.add(settings.data, 'paused').name('Game Paused');


gui.close();
