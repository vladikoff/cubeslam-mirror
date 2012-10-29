
var settings = exports;

settings.data = {

    // game
    inputType: "mouse",
    arenaWidth: 800,
    arenaHeight: 1600,
    paused: false,
    reversed: false,

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
    pointSmoothing:5
}
    
settings.extend = function ( obj ) {
    if (typeof obj == 'object') {
        for (var prop in obj) {

            if (obj.hasOwnProperty(prop)) {
                my.data[prop] = obj[prop];
            }
        }
    }
};


// dat.GUI is global, included in the HTML
var gui = new dat.GUI({ autoPlace: false });
gui.width = 332;

document.getElementById("settingsGUIContainer").appendChild(gui.domElement);

var f;

f = gui.addFolder('Game settings');
f.add(settings.data, 'arenaWidth').min(400).name('Arena width');
f.add(settings.data, 'arenaHeight').min(400).name('Arena length');
f.add(settings.data, 'inputType').options("mouse","motion").name("input type");

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
// f.add(settings.data, 'reversed').name('Game Reversed'); // TODO this doesn't work anymore...

gui.close();