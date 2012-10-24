module.exports = MotionTracker;

MotionTracker.prototype = {
  update: function(){
    this.update();
  }
}

function MotionTracker(){

  var tracker = this;

  var INPUT_SCALE = 2;
  var INPUT_WIDTH = 320/INPUT_SCALE;
  var INPUT_HEIGHT = 240/INPUT_SCALE;
  var MIN_BLOB_SIDE = 10;
  var MEDIAN_POSITION_LENGTH = 15;
  var VIDEO_FPS = 60;

  var is_webkit = false;
  var videoInput, videoInputCanvas,videoTextureCanvas;
  var fxStacks = [];
  var inputSplitList = [];
  var bufferCanvasStack = [];
  var blobRectCanvas;
  var floodfillDebugCanvas;

  var motionFadeCanvas;
  var motionResultBuffer = []; 
  var finalOutputCanvas;
  var bFirstTime = true;
  var textures = [];

  var boundsBoxes = [];
  var markerToX = 0;
  var markerToY = 0;
  var markerCurrentX = 0;
  var markerCurrentY = 0;
  var colorMarkerX = 0;
  var colorMarkerY = 0;
  var lastFrameNumber = 0;
  var smoothedMarkersListX = new Array(MEDIAN_POSITION_LENGTH);
  var smoothedMarkersListY = new Array(MEDIAN_POSITION_LENGTH);

  var properties = {

      showMonitors:true,
      useMotionTracking:true,

      trackingColorPreBlur: 20,
      trackingColor: [102,24,37],
      trackingColorThreshold: 0.32,
      trackingColorAutoThreshold: true,

      
      trackingColorBlur: 20-1.6,
      trackingColorBlurThreshold: 0.1,

      motionBlur:20-3,
      motionThreshold:0.03,

      pointSmoothing:MEDIAN_POSITION_LENGTH
      

  }

  tracker.trackerUpdateSignal = new signals.Signal();
  tracker.colorUpdateSignal = new signals.Signal();
  tracker.videoTextureSignal = new signals.Signal();
  tracker.userMediaSignal = new signals.Signal();

  tracker.init = function(){

    var colors = localStorage.getItem('paddleColor');

    if( colors ) {
      properties.trackingColor = colors.split(":");

      $("#colorSelectArea").css("border-color", "rgb("+properties.trackingColor[0]+","+properties.trackingColor[1]+","+properties.trackingColor[2]+")");
    }

    
    if( properties.showMonitors ) {
        $("#fxMonitors").show();
        //$("#videoInput").show();
      }
      else {
        $("#fxMonitors").hide();
        //$("#videoInput").hide();
      }


    if (navigator.getUserMedia) {
        // opera users (hopefully everyone else at some point)
        navigator.getUserMedia({video: true, audio: true}, tracker.onSuccess, tracker.onError);
    }
    else if (navigator.webkitGetUserMedia) {
        // webkit users
        is_webkit = true;

        navigator.webkitGetUserMedia({video: true, audio: false}, tracker.onSuccess, tracker.onError);
    }
    else {
        // moms, dads, grandmas, and grandpas
        alert("sorry, no webcam support.")
    }
    
  }

  tracker.onSuccess = function(stream) {

    $("#activateCamHolder").fadeOut();

    var source;

    tracker.setupElements();
    tracker.initGUI();

    videoInput.addEventListener('loadedmetadata', tracker.onVideoFeedReady);

    videoInput.width = INPUT_WIDTH*INPUT_SCALE;
    videoInput.height = INPUT_HEIGHT*INPUT_SCALE;
    videoInput.autoplay = true; // you can set this in your markup instead

    if (!is_webkit) {
        source = stream;
    }
    else {
        source = window.webkitURL.createObjectURL(stream);
    }

    tracker.userMediaSignal.dispatch(stream,source);

    window.URL = window.URL || window.webkitURL;
    videoInput.src = source;
    
  }

  tracker.onError = function() {
    $("#activateCamHolder").fadeOut();
    // null = no media
    tracker.userMediaSignal.dispatch(null,null);
  }

  tracker.initGUI = function() {

    var gui = new dat.GUI({ autoPlace: false });
    gui.width = 332;
    $("#uiContainer").append(gui.domElement);

    /*gui.add(properties,"showMonitors").name("Show monitors").onChange(function(value) {
      // Fires on every change, drag, keypress, etc.
      if( properties.showMonitors ) {
        $("#fxMonitors").show();
        //$("#videoInput").show();
      }
      else {
        $("#fxMonitors").hide();
        //$("#videoInput").hide();
      }
    })*/

    gui.add(properties,"useMotionTracking").name("Use motion tracking");
    gui.add(properties,"pointSmoothing").min(1).max(20).name("Smoothing").onChange(function(){

      smoothedMarkersListX = new Array( Math.ceil(properties.pointSmoothing));
      smoothedMarkersListY = new Array( Math.ceil(properties.pointSmoothing));

      for (var i = 0; i < properties.pointSmoothing; i++) {
        smoothedMarkersListX[i] = 0;
        smoothedMarkersListY[i] = 0;
      };

    });


    var f1 = gui.addFolder('Tracking color');
    f1.add(properties, 'trackingColorPreBlur').min(0.1).max(20).name('pre blur');
    f1.addColor(properties, 'trackingColor').name("color").listen();
    f1.add(properties, 'trackingColorThreshold').min(0).max(1).name("threshold").listen();
    f1.add(properties, 'trackingColorAutoThreshold').name("auto threshold");
    //f1.add(properties, 'trackingColorBlur').min(0.1).max(20).name('post blur');
    //f1.add(properties, 'trackingColorBlurThreshold').min(0.05).max(1).name("erode");
    //f1.open();

    var f2 = gui.addFolder("Motion detection");
    f2.add(properties, 'motionThreshold').min(0).max(1).name("threshold");
   // f2.add(properties, 'motionBlur').min(0.1).max(20).name("blur");
    //f2.open();
    //gui.open()



    tracker.colorUpdateSignal.dispatch(properties.trackingColor[0],properties.trackingColor[1],properties.trackingColor[2] );

    var newItem = $("<li class='cr boolean ui_video' ></li>"); 
    newItem.first().append($("#uiTopContent"));

    var $target = $(".dg").find("ul").first().prepend( newItem );
    
    gui.close();

    $("#controlPanel").show();
  }

  tracker.setupElements = function(){

    videoInput = document.getElementById('videoInput');
    //videoInput.addEventListener("mousedown", tracker.onCanvasClicked);

    $("body").keypress(function(event) {
      if ( event.which == 32 ) {
        
        $("#colorSelectContainer").show();

        colorMarkerX = INPUT_WIDTH-Math.floor(($("#colorSelectArea").position().left+$("#colorSelectCenter").position().left)/$("#colorSelectContainer").width()*INPUT_WIDTH);
        colorMarkerY = Math.floor(($("#colorSelectArea").position().top+$("#colorSelectCenter").position().top)/$("#colorSelectContainer").width()*INPUT_HEIGHT);

         event.preventDefault();
       }
    });

    $("body").keyup(function(event) {
      if ( event.which == 32 ) {
        
        $("#colorSelectContainer").hide();

       // var relPos = eventToCoords(videoInput,evt);
       
        var c = bufferCanvasStack[1].getContext("2d").getImageData( colorMarkerX, colorMarkerY, 1, 1).data;
    
        properties.trackingColor = [c[0],c[1],c[2]];
        tracker.colorUpdateSignal.dispatch(c[0],c[1],c[2]);

        localStorage.setItem("paddleColor", c[0] + ":" + c[1] + ":" + c[2]);

        $("#marker").css("background-color", "rgb("+c[0]+","+c[1]+","+c[2]+")");

         event.preventDefault();
       }
    });

    videoInputCanvas = document.createElement('canvas');//document.getElementById('videoInputCanvas');
    videoInputCanvas.width = INPUT_WIDTH;
    videoInputCanvas.height = INPUT_HEIGHT;
   
    //fx stacks
    var fxCanvas = fx.canvas();
    $("#monitorFinalContainer").prepend(fxCanvas);
    fxStacks[0] = fxCanvas;

    blobRectCanvas = document.createElement('canvas');
    blobRectCanvas.width = INPUT_WIDTH;
    blobRectCanvas.height = INPUT_HEIGHT;
    $("#monitorFinalBlobs").prepend(blobRectCanvas);

    for( var i=0;i<4;i++) {

        var bufferCanvas = document.createElement('canvas');
        bufferCanvas.width = INPUT_WIDTH;
        bufferCanvas.height = INPUT_HEIGHT;
        bufferCanvasStack[i] = bufferCanvas;

        //fill with video
        bufferCanvas.getContext("2d").drawImage(videoInput, 0, 0, INPUT_WIDTH, INPUT_HEIGHT);
    }

    for (var i = 0; i < MEDIAN_POSITION_LENGTH; i++) {
      smoothedMarkersListX[i] = 0;
      smoothedMarkersListY[i] = 0;
    };

  }

  tracker.onVideoFeedReady = function(){

    //create textures
    textures["currentFrame"] = fxStacks[0].texture(INPUT_WIDTH,INPUT_HEIGHT);
    textures["lastFrame"] = fxStacks[0].texture(INPUT_WIDTH,INPUT_HEIGHT);

    tracker.update();

    videoTextureCanvas = document.createElement('canvas');//document.getElementById('videoInputCanvas');
    videoTextureCanvas.width = videoInput.videoWidth
    videoTextureCanvas.height = videoInput.videoHeight
  }

  tracker.update = function() {
    if( videoInput ){

      var c = bufferCanvasStack[1].getContext("2d").getImageData( colorMarkerX, colorMarkerY, 1, 1).data;
      
      $("#colorSelectArea").css("border-color", "rgb("+c[0]+","+c[1]+","+c[2]+")");

      var currentFrameNumber = Math.floor(videoInput.currentTime * VIDEO_FPS);
      if (currentFrameNumber > lastFrameNumber) {
        tracker.doTracking();
        lastFrameNumber = currentFrameNumber;
      }
    }
    
  }

  tracker.doTracking = function(){

     //get data from webcam, save it to first index in buffer 
    var selectedBufferCanvas = bufferCanvasStack.splice(bufferCanvasStack.length-1,1)[0]; 
    selectedBufferCanvas.getContext("2d").drawImage(videoInput, 0, 0, INPUT_WIDTH, INPUT_HEIGHT);
    bufferCanvasStack.splice(1,0,selectedBufferCanvas);

    videoInputCanvas.getContext("2d").drawImage(videoInput, 0, 0, INPUT_WIDTH, INPUT_HEIGHT);
    //videoTextureCanvas.getContext("2d").drawImage(videoInput, 0, 0, videoTextureCanvas.width, videoTextureCanvas.height);


    tracker.videoTextureSignal.dispatch(videoInputCanvas);

    textures["currentFrame"].loadContentsOf(videoInputCanvas);
    textures["lastFrame"].loadContentsOf(bufferCanvasStack[bufferCanvasStack.length-1]);
    //fx stack 1

    fxStacks[0].draw(textures["lastFrame"]);
    
    fxStacks[0].motionBlob(
      textures["currentFrame"], 
      20-properties.motionBlur,
      properties.motionThreshold,
      20-properties.trackingColorPreBlur,
      properties.trackingColor[0]/255,properties.trackingColor[1]/255,properties.trackingColor[2]/255, 
      properties.trackingColorThreshold,
      properties.useMotionTracking?1:0,
      INPUT_WIDTH, 
      INPUT_HEIGHT
    )
    
    fxStacks[0].update();

   
    tracker.blobDetect();

    smoothedMarkersListX.unshift(markerToX);
    smoothedMarkersListY.unshift(markerToY);
    smoothedMarkersListX.pop();
    smoothedMarkersListY.pop();

    var smoothedMarkerToX = 0;
    var smoothedMarkerToY = 0;

    for (var i = 0; i < properties.pointSmoothing; i++) {
      smoothedMarkerToX += smoothedMarkersListX[i];
      smoothedMarkerToY += smoothedMarkersListY[i];
    };

    smoothedMarkerToX /= properties.pointSmoothing;
    smoothedMarkerToY /= properties.pointSmoothing;

    markerCurrentX = smoothedMarkerToX;

    markerCurrentY = smoothedMarkerToY; 

    tracker.trackerUpdateSignal.dispatch( markerCurrentX, markerCurrentY )
  }
/*
  tracker.onCanvasClicked = function( evt ){

    var relPos = eventToCoords(videoInput,evt);

    var c = bufferCanvasStack[1].getContext("2d").getImageData( INPUT_WIDTH-relPos.x/INPUT_SCALE, relPos.y/INPUT_SCALE, 1, 1).data;
    
    properties.trackingColor = [c[0],c[1],c[2]];
    tracker.colorUpdateSignal.dispatch(c[0],c[1],c[2]);

    localStorage.setItem("paddleColor", c[0] + ":" + c[1] + ":" + c[2]);

  }
*/
  tracker.blobDetect = function() {
    
    var width = INPUT_WIDTH;
    var height = INPUT_HEIGHT;
    
    var motionByteArray = fxStacks[0].getPixelArray();

    var len = motionByteArray.length;

    var mainBB = {
      minx:INPUT_WIDTH,
      maxx:0,
      miny:INPUT_HEIGHT,
      maxy:0,
    }


    var colorBB = {
      minx:INPUT_WIDTH,
      maxx:0,
      miny:INPUT_HEIGHT,
      maxy:0,
    }

    var currentX;
    var currentY;

    var bUpdate = false;

    var mainPixelsFound = 0;
    var colorPixelsFound = 0;
    //fill blob detection image data

    var searchColorChannel = properties.useMotionTracking?2:0;

    for(var i=0;i<len;i+=4)
    {
      currentX = parseInt((i/4)%(INPUT_WIDTH));
      currentY = parseInt((i/4)/(INPUT_WIDTH)) 

      if( (motionByteArray[i+searchColorChannel] ) > 0 ) {
        if( currentX < mainBB.minx ) mainBB.minx = currentX;
        if( currentX > mainBB.maxx ) mainBB.maxx = currentX;
        if( currentY < mainBB.miny ) mainBB.miny = currentY;
        if( currentY > mainBB.maxy ) mainBB.maxy = currentY;

        mainPixelsFound++

      }  

      if( (motionByteArray[i] ) > 0 ) {
        if( currentX < colorBB.minx ) colorBB.minx = currentX;
        if( currentX > colorBB.maxx ) colorBB.maxx = currentX;
        if( currentY < colorBB.miny ) colorBB.miny = currentY;
        if( currentY > colorBB.maxy ) colorBB.maxy = currentY;

        colorPixelsFound++
      }
    }

    if( properties.trackingColorAutoThreshold) {
      if( colorPixelsFound < 80 ) {
        properties.trackingColorThreshold += 0.01
      }
      else if( colorBB.maxx - colorBB.minx > 30 ) {
        properties.trackingColorThreshold -= 0.01
      }

      if( properties.trackingColorThreshold > 0.6) properties.trackingColorThreshold = 0.6
      else if( properties.trackingColorThreshold < 0.1) properties.trackingColorThreshold = 0.1
    }

    if( mainPixelsFound > 10 ) {

      var localX = mainBB.minx + (mainBB.maxx - mainBB.minx)/2
      var localY = mainBB.miny + (mainBB.maxy - mainBB.miny)/2
      
      blobRectCanvas.getContext("2d").clearRect(0,0,INPUT_WIDTH,INPUT_HEIGHT);
      blobRectCanvas.getContext("2d").strokeStyle = "#ff0000";
      blobRectCanvas.getContext("2d").strokeRect(mainBB.minx,mainBB.miny,mainBB.maxx-mainBB.minx,mainBB.maxy-mainBB.miny);

      markerToX = localX / INPUT_WIDTH//*2 - 0.5;
      markerToY = localY / INPUT_HEIGHT;
    }
  }

  return tracker;
}


function eventToCoords(element,event) {
  var totalOffsetX = 0;
  var totalOffsetY = 0;
  var canvasX = 0;
  var canvasY = 0;
  var currentElement = element;

  do {
    totalOffsetX += currentElement.offsetLeft;
    totalOffsetY += currentElement.offsetTop;
  }
  while (currentElement = currentElement.offsetParent)

  canvasX = event.pageX - totalOffsetX;
  canvasY = event.pageY - totalOffsetY;

  // Fix for variable canvas width
  canvasX = Math.round( canvasX * (element.width / element.offsetWidth) );
  canvasY = Math.round( canvasY * (element.height / element.offsetHeight) );

  return {x:canvasX, y:canvasY}
}

/*
 * glfx.js
 * http://evanw.github.com/glfx.js/
 *
 * Copyright 2011 Evan Wallace
 * Released under the MIT license
 */
var fx = (function() {
var exports = {};

// src/core/canvas.js
var gl;
var targetTextureType;

function log() {
    if (console && console.log) console.log.apply(console, arguments);
}

function clamp(lo, value, hi) {
    return Math.max(lo, Math.min(value, hi));
}

function wrapTexture(texture) {

    return {
        _: texture,
        loadContentsOf: function(element) { 
            
            //set correct global gl
            gl = this._.gl;

            this._.loadContentsOf(element); 
        },
        clear: function() { this._.clear(); },
        width: function() { return this._.width; },
        height: function() { return this._.height; },
        destroy: function() { this._.destroy(); }
    };
}

function texture(element) {
    if (arguments.length == 2) {
        return wrapTexture(new Texture(arguments[0], arguments[1], gl.RGBA, targetTextureType));
    }
    return wrapTexture(Texture.fromElement(element));
}

function initialize(width, height) {

    if (this._.texture) this._.texture.destroy();
    if (this._.spareTexture) this._.spareTexture.destroy();
    this.width = width;
    this.height = height;
    this._.texture = new Texture(width, height, gl.RGBA, targetTextureType);
    this._.spareTexture = new Texture(width, height, gl.RGBA, targetTextureType);
    this._.extraTexture = this._.extraTexture || new Texture(0, 0, gl.RGBA, targetTextureType);
    this._.flippedShader = this._.flippedShader || new Shader(null, '\
        uniform sampler2D texture;\
        varying vec2 texCoord;\
        void main() {\
            gl_FragColor = texture2D(texture, vec2(texCoord.x, 1.0 - texCoord.y));\
        }\
    ');
    this._.isInitialized = true;
}

/*
   Draw a texture to the canvas, with an optional width and height to scale to.
   If no width and height are given then the original texture width and height
   are used.
*/
function draw(texture, width, height) {
    if (!this._.isInitialized || texture._.width != this.width || texture._.height != this.height) {
        initialize.call(this, width ? width : texture._.width, height ? height : texture._.height);
    }
    texture._.use();
    this._.texture.drawTo(function() {
        Shader.getDefaultShader().drawRect();
    });

    return this;
}

function update() {
    this._.texture.use();
    this._.flippedShader.drawRect();
    return this;
}

function simpleShader(shader, uniforms, textureIn, textureOut) {
    (textureIn || this._.texture).use();
    this._.spareTexture.drawTo(function() {
        shader.uniforms(uniforms).drawRect();
    });
    this._.spareTexture.swapWith(textureOut || this._.texture);
}

function replace(node) {
    node.parentNode.insertBefore(this, node);
    node.parentNode.removeChild(node);
    return this;
}

function contents() {
    var texture = new Texture(this._.texture.width, this._.texture.height, gl.RGBA, targetTextureType);
    this._.texture.use();
    texture.drawTo(function() {
        Shader.getDefaultShader().drawRect();
    });
    return wrapTexture(texture);
}

function swapContentsWith(texture) {
    this._.texture.swapWith(texture._ || texture);
}

/*
   Get a Uint8 array of pixel values: [r, g, b, a, r, g, b, a, ...]
   Length of the array will be width * height * 4.
*/
function getPixelArray() {
    var w = this._.texture.width;
    var h = this._.texture.height;
    var array = new Uint8Array(w * h * 4);
    this._.texture.drawTo(function() {
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, array);
    });
    return array;
}

// Fix broken toDataURL() methods on some implementations
function toDataURL(mimeType) {
    var w = this._.texture.width;
    var h = this._.texture.height;
    var array = getPixelArray.call(this);
    var canvas2d = document.createElement('canvas');
    var c = canvas2d.getContext('2d');
    canvas2d.width = w;
    canvas2d.height = h;
    var data = c.createImageData(w, h);
    for (var i = 0; i < array.length; i++) {
        data.data[i] = array[i];
    }
    c.putImageData(data, 0, 0);
    return canvas2d.toDataURL(mimeType);
}

function wrap(func) {
    return function() {
        // Make sure that we're using the correct global WebGL context
        gl = this._.gl;

        // Now that the context has been switched, we can call the wrapped function
        return func.apply(this, arguments);
    };
}

exports.selectActiveCanvas =  function( activeCanvas ) {
    gl = activeCanvas._.gl;
}

exports.canvas = function() {
    var canvas = document.createElement('canvas');
    var errorText = 'Unknown';
    function contextCreationError(e) {
        canvas.removeEventListener('webglcontextcreationerror', contextCreationError, false);
        if (e.statusMessage) errorText = e.statusMessage;
    }
    canvas.addEventListener('webglcontextcreationerror', contextCreationError, false);
    try {
        gl = canvas.getContext('experimental-webgl');
    } catch (e) {
        gl = null;
    }
    if (!gl) {
        throw new Error('This browser does not support WebGL, reason: ' + errorText);
    }
    gl.generation = 0;
    canvas.addEventListener('webglcontextlost', function(e) {
        e.preventDefault();
        log('context lost');
    }, false);
    canvas.addEventListener('webglcontextrestored', function() {
        gl.generation++;
        log('context restored');
    }, false);
    canvas._ = {
        gl: gl,
        isInitialized: false,
        texture: null,
        spareTexture: null,
        flippedShader: null
    };

    // Go for floating point buffer textures if we can, it'll make the bokeh filter look a lot better
    targetTextureType = gl.getExtension('OES_texture_float') ? gl.FLOAT : gl.UNSIGNED_BYTE;

    // Core methods
    canvas.texture = wrap(texture);
    canvas.draw = wrap(draw);
    canvas.update = wrap(update);
    canvas.replace = wrap(replace);
    canvas.contents = wrap(contents);
    canvas.getPixelArray = wrap(getPixelArray);
    canvas.toDataURL = wrap(toDataURL);
    canvas.swapContentsWith = wrap(swapContentsWith);

    // Filter methods
    canvas.blob = wrap(blob);
    canvas.motion = wrap(motion);
    canvas.motionBlob = wrap(motionBlob);
    
    return canvas;
};


// src/core/matrix.js
// from javax.media.jai.PerspectiveTransform

function getSquareToQuad(x0, y0, x1, y1, x2, y2, x3, y3) {
    var dx1 = x1 - x2;
    var dy1 = y1 - y2;
    var dx2 = x3 - x2;
    var dy2 = y3 - y2;
    var dx3 = x0 - x1 + x2 - x3;
    var dy3 = y0 - y1 + y2 - y3;
    var det = dx1*dy2 - dx2*dy1;
    var a = (dx3*dy2 - dx2*dy3) / det;
    var b = (dx1*dy3 - dx3*dy1) / det;
    return [
        x1 - x0 + a*x1, y1 - y0 + a*y1, a,
        x3 - x0 + b*x3, y3 - y0 + b*y3, b,
        x0, y0, 1
    ];
}

function getInverse(m) {
    var a = m[0], b = m[1], c = m[2];
    var d = m[3], e = m[4], f = m[5];
    var g = m[6], h = m[7], i = m[8];
    var det = a*e*i - a*f*h - b*d*i + b*f*g + c*d*h - c*e*g;
    return [
        (e*i - f*h) / det, (c*h - b*i) / det, (b*f - c*e) / det,
        (f*g - d*i) / det, (a*i - c*g) / det, (c*d - a*f) / det,
        (d*h - e*g) / det, (b*g - a*h) / det, (a*e - b*d) / det
    ];
}

function multiply(a, b) {
    return [
        a[0]*b[0] + a[1]*b[3] + a[2]*b[6],
        a[0]*b[1] + a[1]*b[4] + a[2]*b[7],
        a[0]*b[2] + a[1]*b[5] + a[2]*b[8],
        a[3]*b[0] + a[4]*b[3] + a[5]*b[6],
        a[3]*b[1] + a[4]*b[4] + a[5]*b[7],
        a[3]*b[2] + a[4]*b[5] + a[5]*b[8],
        a[6]*b[0] + a[7]*b[3] + a[8]*b[6],
        a[6]*b[1] + a[7]*b[4] + a[8]*b[7],
        a[6]*b[2] + a[7]*b[5] + a[8]*b[8]
    ];
}

// src/core/shader.js
var Shader = (function() {
    function isArray(obj) {
        return Object.prototype.toString.call(obj) == '[object Array]';
    }

    function isNumber(obj) {
        return Object.prototype.toString.call(obj) == '[object Number]';
    }

    function compileSource(type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw 'compile error: ' + gl.getShaderInfoLog(shader);
        }
        return shader;
    }

    var defaultVertexSource = '\
    attribute vec2 vertex;\
    attribute vec2 _texCoord;\
    varying vec2 texCoord;\
    void main() {\
        texCoord = _texCoord;\
        gl_Position = vec4(vertex * 2.0 - 1.0, 0.0, 1.0);\
    }';

    var defaultFragmentSource = '\
    uniform sampler2D texture;\
    varying vec2 texCoord;\
    void main() {\
        gl_FragColor = texture2D(texture, texCoord);\
    }';

    function Shader(vertexSource, fragmentSource) {
        
        this.contextGeneration = gl.generation;
        this.vertexSource = vertexSource;
        this.fragmentSource = fragmentSource;
        this.uniformValues = {};
        this.textureValues = {};

        this.uniformLocations = {};
        this.vertexAttribute = null;
        this.texCoordAttribute = null;
        this.program = gl.createProgram();
        vertexSource = vertexSource || defaultVertexSource;
        fragmentSource = fragmentSource || defaultFragmentSource;
        fragmentSource = 'precision highp float;' + fragmentSource; // annoying requirement is annoying
        gl.attachShader(this.program, compileSource(gl.VERTEX_SHADER, vertexSource));
        gl.attachShader(this.program, compileSource(gl.FRAGMENT_SHADER, fragmentSource));
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            throw new Error('link error: ' + gl.getProgramInfoLog(this.program));
        }
    }

    Shader.prototype.recreateIfContextWasLost = function() {
        if (this.program && !gl.isProgram(this.program) && gl.generation > this.contextGeneration) {
            Shader.call(this, this.vertexSource, this.fragmentSource);
            this.uniforms(this.uniformValues);
            this.textures(this.textureValues);
            this.contextGeneration = gl.generation;
            log('recreated shader');
        }
    };

    Shader.prototype.destroy = function() {
        gl.deleteProgram(this.program);
        this.program = null;
    };

    Shader.prototype.uniforms = function(uniforms) {
        this.recreateIfContextWasLost();
        gl.useProgram(this.program);
        for (var name in uniforms) {
            if (!uniforms.hasOwnProperty(name)) continue;
            var location = this.uniformLocations[name] || (this.uniformLocations[name] = gl.getUniformLocation(this.program, name));
            if (location === null) continue; // will be null if the uniform isn't used in the shader
            var value = uniforms[name];
            if (isArray(value)) {
                switch (value.length) {
                    case 1: gl.uniform1fv(location, new Float32Array(value)); break;
                    case 2: gl.uniform2fv(location, new Float32Array(value)); break;
                    case 3: gl.uniform3fv(location, new Float32Array(value)); break;
                    case 4: gl.uniform4fv(location, new Float32Array(value)); break;
                    case 9: gl.uniformMatrix3fv(location, false, new Float32Array(value)); break;
                    case 16: gl.uniformMatrix4fv(location, false, new Float32Array(value)); break;
                    default: throw 'dont\'t know how to load uniform "' + name + '" of length ' + value.length;
                }
            } else if (isNumber(value)) {
                gl.uniform1f(location, value);
            } else {
                throw 'attempted to set uniform "' + name + '" to invalid value ' + (value || 'undefined').toString();
            }
            this.uniformValues[name] = value;
        }
        // allow chaining
        return this;
    };

    // textures are uniforms too but for some reason can't be specified by gl.uniform1f,
    // even though floating point numbers represent the integers 0 through 7 exactly
    Shader.prototype.textures = function(textures) {
        this.recreateIfContextWasLost();
        gl.useProgram(this.program);
        for (var name in textures) {
            if (!textures.hasOwnProperty(name)) continue;
            var location = this.uniformLocations[name] || (this.uniformLocations[name] = gl.getUniformLocation(this.program, name));
            if (location === null) continue; // will be null if the uniform isn't used in the shader
            var value = textures[name];
            gl.uniform1i(location, value);
            this.textureValues[name] = value;
        }
        // allow chaining
        return this;
    };

    Shader.prototype.drawRect = function(left, top, right, bottom, cropToRect) {
        this.recreateIfContextWasLost();

        var undefined;
        var viewport = gl.getParameter(gl.VIEWPORT);
        top = top !== undefined ? (top - viewport[1]) / viewport[3] : 0;
        left = left !== undefined ? (left - viewport[0]) / viewport[2] : 0;
        right = right !== undefined ? (right - viewport[0]) / viewport[2] : 1;
        bottom = bottom !== undefined ? (bottom - viewport[1]) / viewport[3] : 1;
        if (gl.vertexBuffer == null || !gl.isBuffer(gl.vertexBuffer)) {
            gl.vertexBuffer = gl.createBuffer();
        }
        var vertices = [ left, top, left, bottom, right, top, right, bottom ];
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        if (gl.texCoordBuffer == null || !gl.isBuffer(gl.texCoordBuffer)) {
            gl.texCoordBuffer = gl.createBuffer();
        }
        var coords = cropToRect ? vertices : [ 0, 0, 0, 1, 1, 0, 1, 1 ];
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords), gl.STATIC_DRAW);
        if (this.vertexAttribute == null) {
            this.vertexAttribute = gl.getAttribLocation(this.program, 'vertex');
            gl.enableVertexAttribArray(this.vertexAttribute);
        }
        if (this.texCoordAttribute == null) {
            this.texCoordAttribute = gl.getAttribLocation(this.program, '_texCoord');
            gl.enableVertexAttribArray(this.texCoordAttribute);
        }
        gl.useProgram(this.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.vertexBuffer);
        gl.vertexAttribPointer(this.vertexAttribute, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.texCoordBuffer);
        gl.vertexAttribPointer(this.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    Shader.getDefaultShader = function() {
        gl.defaultShader = gl.defaultShader || new Shader();
        return gl.defaultShader;
    };

    return Shader;
})();

// src/core/texture.js
var Texture = (function() {
    Texture.fromElement = function(element) {
        var texture = new Texture(0, 0, gl.RGBA, gl.UNSIGNED_BYTE);
        texture.loadContentsOf(element);
        return texture;
    };

    function Texture(width, height, format, type) {
        
        this.gl = gl;
        this.id = gl.createTexture();
        this.width = width;
        this.height = height;
        this.format = format;
        this.type = type;

        this.contextGeneration = gl.generation;
        this.contents = null;

        gl.bindTexture(gl.TEXTURE_2D, this.id);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        if (width && height) gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, null);
    }

    Texture.prototype.recreateIfContextWasLost = function() {
        if (this.id && !gl.isTexture(this.id) && gl.generation > this.contextGeneration) {
            var contents = this.contents;
            Texture.call(this, this.width, this.height, this.format, this.type);
            if (contents instanceof Node) this.loadContentsOf(contents);
            else if (contents) this.initFromBytes(this.width, this.height, contents);
            this.contents = contents;
            this.contextGeneration = gl.generation;
            function findWebGLEnum(value) {
                for (var name in gl) { if (gl[name] == value) return name; }
                return '???';
            }
            log('recreated texture { width: ' + this.width + ', height: ' + this.height +
                ', format: ' + findWebGLEnum(this.format) + ', type: ' + findWebGLEnum(this.type) +
                ', contents: ' + (contents === null ? 'null' : contents.constructor ? contents.constructor.name : '???') + ' }');
        }
    };

    Texture.prototype.loadContentsOf = function(element) {

        this.width = element.width || element.videoWidth;
        this.height = element.height || element.videoHeight;
        this.contents = element;
        
        gl.bindTexture(gl.TEXTURE_2D, this.id);
        gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.format, this.type, element);
    };

    Texture.prototype.initFromBytes = function(width, height, data) {
        this.width = width;
        this.height = height;
        this.format = gl.RGBA;
        this.type = gl.UNSIGNED_BYTE;
        this.contents = data;
        gl.bindTexture(gl.TEXTURE_2D, this.id);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, this.type, new Uint8Array(data));
    };

    Texture.prototype.destroy = function() {
        gl.deleteTexture(this.id);
        this.id = null;
    };

    Texture.prototype.use = function(unit) {
        this.recreateIfContextWasLost();
        gl.activeTexture(gl.TEXTURE0 + (unit || 0));
        gl.bindTexture(gl.TEXTURE_2D, this.id);
    };

    Texture.prototype.unuse = function(unit) {
        gl.activeTexture(gl.TEXTURE0 + (unit || 0));
        gl.bindTexture(gl.TEXTURE_2D, null);
    };

    Texture.prototype.ensureFormat = function(width, height, format, type) {
        // allow passing an existing texture instead of individual arguments
        if (arguments.length == 1) {
            var texture = arguments[0];
            width = texture.width;
            height = texture.height;
            format = texture.format;
            type = texture.type;
        }

        // change the format only if required
        if (width != this.width || height != this.height || format != this.format || type != this.type) {
            this.width = width;
            this.height = height;
            this.format = format;
            this.type = type;
            this.contents = null;
            gl.bindTexture(gl.TEXTURE_2D, this.id);
            gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, null);
        }
    };

    Texture.prototype.drawTo = function(callback) {
        // start rendering to this texture
        this.recreateIfContextWasLost();
        if (!gl.framebuffer || !gl.isFramebuffer(gl.framebuffer)) gl.framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, gl.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);
        gl.viewport(0, 0, this.width, this.height);

        // do the drawing
        callback();

        // stop rendering to this texture
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.contents = null;
    };

    Texture.prototype.clear = function() {
        this.drawTo(function() {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        });
    };

    var canvas = null;

    function getCanvas(texture) {
        if (canvas == null) canvas = document.createElement('canvas');
        canvas.width = texture.width;
        canvas.height = texture.height;
        var c = canvas.getContext('2d');
        c.clearRect(0, 0, canvas.width, canvas.height);
        return c;
    }

    Texture.prototype.fillUsingCanvas = function(callback) {
        callback(getCanvas(this));
        this.format = gl.RGBA;
        this.type = gl.UNSIGNED_BYTE;
        gl.bindTexture(gl.TEXTURE_2D, this.id);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        this.contents = null;
        return this;
    };

    Texture.prototype.toImage = function(image) {
        this.use();
        Shader.getDefaultShader().drawRect();
        var size = this.width * this.height * 4;
        var pixels = new Uint8Array(size);
        var c = getCanvas(this);
        var data = c.createImageData(this.width, this.height);
        gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        for (var i = 0; i < size; i++) {
            data.data[i] = pixels[i];
        }
        c.putImageData(data, 0, 0);
        image.src = canvas.toDataURL();
    };

    Texture.prototype.swapWith = function(other) {
        var temp;
        temp = other.id; other.id = this.id; this.id = temp;
        temp = other.width; other.width = this.width; this.width = temp;
        temp = other.height; other.height = this.height; this.height = temp;
        temp = other.format; other.format = this.format; this.format = temp;
        temp = this.contents; other.contents = this.contents; this.contents = temp;
    };

    return Texture;
})();


function motionBlob( texture, motionBlur, motionThreshold, preBlur, r,g,b,trackThreshold, useMotion, width, height ) {
    gl.motionBlob = gl.motionBlob || new Shader(null, '\
        uniform sampler2D maskTexture;\
        uniform sampler2D originalTexture;\
        varying vec2 texCoord;\
        uniform vec2 texSize;\
        uniform float motionBlur;\
        uniform float motionThreshold;\
        uniform vec3 trackColor;\
        uniform float preBlur;\
        uniform float trackThreshold;\
        uniform bool useMotion;\
        \
        vec3 RGBToHSL(vec3 color) {\
            vec3 hsl;\
            float fmin = min(min(color.r, color.g), color.b);\
            float fmax = max(max(color.r, color.g), color.b);\
            float delta = fmax - fmin;\
            hsl.z = (fmax + fmin) / 2.0;\
            \
            if (delta == 0.0) {\
                hsl.x = 0.0;\
                hsl.y = 0.0;\
            }\
            else {\
                if (hsl.z < 0.5)\
                    hsl.y = delta / (fmax + fmin);\
                else\
                    hsl.y = delta / (2.0 - fmax - fmin); \
                \
                float deltaR = (((fmax - color.r) / 6.0) + (delta / 2.0)) / delta;\
                float deltaG = (((fmax - color.g) / 6.0) + (delta / 2.0)) / delta;\
                float deltaB = (((fmax - color.b) / 6.0) + (delta / 2.0)) / delta;\
                \
                if (color.r == fmax )\
                    hsl.x = deltaB - deltaG;\
                else if (color.g == fmax)\
                    hsl.x = (1.0 / 3.0) + deltaR - deltaB;\
                else if (color.b == fmax)\
                    hsl.x = (2.0 / 3.0) + deltaG - deltaR;\
                \
                if (hsl.x < 0.0) {\
                    hsl.x += 1.0;\
                }else if (hsl.x > 1.0){\
                    hsl.x -= 1.0;\
                }\
            }\
            \
            return hsl;\
        }\
        \
        void main() {\
            vec2 mirrorCoords = vec2((1.0-texCoord.x),texCoord.y);\
            vec4 center = texture2D(originalTexture, mirrorCoords);\
            vec4 color = vec4(0.0);\
            float total = 0.0;\
            for (float x = -4.0; x <= 4.0; x += 1.0) {\
                for (float y = -4.0; y <= 4.0; y += 1.0) {\
                    vec4 sample = texture2D(originalTexture, mirrorCoords + vec2(x, y) / texSize);\
                    float weight = 1.0 - abs(dot(sample.rgb - center.rgb, vec3(0.25)));\
                    weight = pow(weight, preBlur);\
                    color += sample * weight;\
                    total += weight;\
                }\
            }\
            vec4 original = color / total;\
            \
            center = texture2D(maskTexture, mirrorCoords);\
            color = vec4(0.0);\
            total = 0.0;\
            for (float x = -4.0; x <= 4.0; x += 1.0) {\
                for (float y = -4.0; y <= 4.0; y += 1.0) {\
                    vec4 sample = texture2D(maskTexture, mirrorCoords + vec2(x, y) / texSize);\
                    float weight = 1.0 - abs(dot(sample.rgb - center.rgb, vec3(0.25)));\
                    weight = pow(weight, preBlur);\
                    color += sample * weight;\
                    total += weight;\
                }\
            }\
            vec4 mask = color / total;\
            \
            \
            float colorStrength = (abs(original.r-mask.r) + abs(original.g-mask.g) + abs(original.b-mask.b)) / 3.0;\
            \
            float distanceColor = distance( RGBToHSL(original.rgb), RGBToHSL(vec3(trackColor.r,trackColor.g,trackColor.b)));\
            gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0);\
            gl_FragColor.r = step(distanceColor,trackThreshold);\
            gl_FragColor.g = step(motionThreshold,colorStrength);\
            if ( gl_FragColor.r == 1.0 && gl_FragColor.g  == 1.0) {\
                gl_FragColor.b = colorStrength;\
            }\
        }\
    ');
/*
 \
            if( (gl_FragColor.r+gl_FragColor.g+gl_FragColor.b)/3.0 > finalThreshold ) {\
                gl_FragColor = gl_FragColor;\
            }\
            else {\
                gl_FragColor = vec4(0.0,0.0,0.0,0.0);\
            }\
// mask.rgb += 0.6;\
            original.rgb += 0.6;\
            mask.rgb = (mask.rgb - 0.5) * (1.0 + 0.0) + 0.5;\
            original.rgb = (original.rgb - 0.5) * (1.0 + 0.0) + 0.5;\
            */
    this._.extraTexture.ensureFormat(this._.texture);
    this._.texture.use();
    this._.extraTexture.drawTo(function() {
        Shader.getDefaultShader().drawRect();
    });

    this._.extraTexture.use(1);

    gl.motionBlob.textures({
        originalTexture: 1
    });
    
    simpleShader.call(this,gl.motionBlob,{
        motionBlur: motionBlur,
        motionThreshold: motionThreshold,
        trackColor: [r,g,b],
        preBlur: preBlur,
        trackThreshold: trackThreshold,
        useMotion: useMotion,
        texSize:[width,height]
    },texture._ || texture );

    this._.extraTexture.unuse(1);

    return this;
}



function blob( preBlur, r,g,b,trackThreshold, finalThreshold, width, height ) {
    gl.blob = gl.blob || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec3 trackColor;\
        uniform vec2 texSize;\
        uniform float preBlur;\
        uniform float trackThreshold;\
        uniform float finalThreshold;\
        varying vec2 texCoord;\
        \
        vec3 RGBToHSL(vec3 color) {\
            vec3 hsl;\
            float fmin = min(min(color.r, color.g), color.b);\
            float fmax = max(max(color.r, color.g), color.b);\
            float delta = fmax - fmin;\
            hsl.z = (fmax + fmin) / 2.0;\
            \
            if (delta == 0.0) {\
                hsl.x = 0.0;\
                hsl.y = 0.0;\
            }\
            else {\
                if (hsl.z < 0.5)\
                    hsl.y = delta / (fmax + fmin);\
                else\
                    hsl.y = delta / (2.0 - fmax - fmin); \
                \
                float deltaR = (((fmax - color.r) / 6.0) + (delta / 2.0)) / delta;\
                float deltaG = (((fmax - color.g) / 6.0) + (delta / 2.0)) / delta;\
                float deltaB = (((fmax - color.b) / 6.0) + (delta / 2.0)) / delta;\
                \
                if (color.r == fmax )\
                    hsl.x = deltaB - deltaG;\
                else if (color.g == fmax)\
                    hsl.x = (1.0 / 3.0) + deltaR - deltaB;\
                else if (color.b == fmax)\
                    hsl.x = (2.0 / 3.0) + deltaG - deltaR;\
                \
                if (hsl.x < 0.0) {\
                    hsl.x += 1.0;\
                }else if (hsl.x > 1.0){\
                    hsl.x -= 1.0;\
                }\
            }\
            \
            return hsl;\
        }\
        \
        void main() {\
            vec2 mirrorCoords = vec2((1.0-texCoord.x),texCoord.y);\
            vec4 center = texture2D(texture, mirrorCoords);\
            vec4 color = vec4(0.0);\
            float total = 0.0;\
            for (float x = -4.0; x <= 4.0; x += 1.0) {\
                for (float y = -4.0; y <= 4.0; y += 1.0) {\
                    vec4 sample = texture2D(texture, mirrorCoords + vec2(x, y) / texSize);\
                    float weight = 1.0 - abs(dot(sample.rgb - center.rgb, vec3(0.25)));\
                    weight = pow(weight, preBlur);\
                    color += sample * weight;\
                    total += weight;\
                }\
            }\
            gl_FragColor = color / total;\
            \
            \
            vec4 original = gl_FragColor;\
            if ( distance( RGBToHSL(original.rgb), RGBToHSL(vec3(trackColor.r,trackColor.g,trackColor.b)) ) < trackThreshold ) {\
                gl_FragColor = original;\
            }\
            else {\
                gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);\
            }\
            \
            color = gl_FragColor;\
           if( (color.r+color.g+color.b)/3.0 > finalThreshold ) {\
                gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);\
            }\
            else {\
                gl_FragColor = vec4(0.0,0.0,0.0,0.0);\
            }\
        }\
    ');

    simpleShader.call(this,gl.blob,{
        trackColor: [r,g,b],
        preBlur: preBlur,
        trackThreshold: trackThreshold,
        finalThreshold: finalThreshold,
        texSize:[width,height]
    });

    return this;
}



function motion( texture, blur, threshold, width, height ) {
    gl.motion = gl.motion || new Shader(null, '\
        uniform sampler2D maskTexture;\
        uniform sampler2D originalTexture;\
        uniform vec2 texSize;\
        uniform float blur;\
        uniform float threshold;\
        varying vec2 texCoord;\
        \
        void main() {\
            vec2 mirrorCoords = vec2((1.0-texCoord.x),texCoord.y);\
            vec4 center = texture2D(originalTexture, mirrorCoords);\
            vec4 color = vec4(0.0);\
            float total = 0.0;\
            for (float x = -4.0; x <= 4.0; x += 1.0) {\
                for (float y = -4.0; y <= 4.0; y += 1.0) {\
                    vec4 sample = texture2D(originalTexture, mirrorCoords + vec2(x, y) / texSize);\
                    float weight = 1.0 - abs(dot(sample.rgb - center.rgb, vec3(0.25)));\
                    weight = pow(weight, blur);\
                    color += sample * weight;\
                    total += weight;\
                }\
            }\
            vec4 original = color / total;\
            \
            center = texture2D(maskTexture, mirrorCoords);\
            color = vec4(0.0);\
            total = 0.0;\
            for (float x = -4.0; x <= 4.0; x += 1.0) {\
                for (float y = -4.0; y <= 4.0; y += 1.0) {\
                    vec4 sample = texture2D(maskTexture, mirrorCoords + vec2(x, y) / texSize);\
                    float weight = 1.0 - abs(dot(sample.rgb - center.rgb, vec3(0.25)));\
                    weight = pow(weight, blur);\
                    color += sample * weight;\
                    total += weight;\
                }\
            }\
            vec4 mask = color / total;\
            \
            mask.rgb += 0.6;\
            original.rgb += 0.6;\
            mask.rgb = (mask.rgb - 0.5) * (1.0 + 0.0) + 0.5;\
            original.rgb = (original.rgb - 0.5) * (1.0 + 0.0) + 0.5;\
            \
            float colorStrength = (abs(original.r-mask.r) + abs(original.g-mask.g) + abs(original.b-mask.b)) / 3.0;\
            if( colorStrength > threshold ) {\
                gl_FragColor = vec4(1.0,1.0,1.0,1.0);\
            }\
            else {\
                gl_FragColor = vec4(0.0,0.0,0.0,1.0);\
            }\
        }\
    ');

    this._.extraTexture.ensureFormat(this._.texture);
    this._.texture.use();
    this._.extraTexture.drawTo(function() {
        Shader.getDefaultShader().drawRect();
    });

    this._.extraTexture.use(1);

    gl.motion.textures({
        originalTexture: 1
    });
    
    simpleShader.call(this,gl.motion,{
        blur: blur,
        threshold: threshold,
        texSize:[width,height]
    },texture._ || texture );

    this._.extraTexture.unuse(1);

    return this;
}


return exports;
})();
