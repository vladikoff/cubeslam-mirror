
var settings = (function () {

    var my = {};

    my.data = {

        inputType: "mouse",
        arenaWidth: 800,
        arenaHeight: 1600,
        //motion tracking
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
    
    initGUI()

    my.extend = function ( obj ) {
        if (typeof obj == 'object') {
            for (var prop in obj) {

                if (obj.hasOwnProperty(prop)) {
                    my.data[prop] = obj[prop];
                }
            }
        }
    };

    function initGUI(){
        var gui = new dat.GUI({ autoPlace: false });
        gui.width = 332;

        document.getElementById("settingsGUIContainer").appendChild(gui.domElement);

        var f = gui.addFolder("Game settings");
        f.add(my.data, 'arenaWidth').min(400).name('Arena width');
        f.add(my.data, 'arenaHeight').min(400).name('Arena length');
        f.add( my.data,"inputType").options("mouse","motion").name("input type");

        f = gui.addFolder('Tracking settings');
        f.add(my.data,"pointSmoothing").min(1).max(20).name("Smoothing");
        f.add(my.data,"useMotionTracking").name("Use motion tracking");
        f.add(my.data, 'motionThreshold').min(0).max(1).name("threshold");


        f = gui.addFolder('Tracking color');
        f.add(my.data, 'trackingColorPreBlur').min(0.1).max(20).name('pre blur');
        f.addColor(my.data, 'trackingColor').name("color").listen();
        f.add(my.data, 'trackingColorThreshold').min(0).max(1).name("threshold").listen();
        f.add(my.data, 'trackingColorAutoThreshold').name("auto threshold");
        
        gui.close();
    }
    
    return my;
})();

module.exports = settings;
