var fx = require('./glfx')
  , Emitter = require('emitter')
  , settings = require('./settings')
  , camera = require('./camera');

module.exports = MotionTracker;

function MotionTracker(){

  var tracker = this;

  Emitter(tracker)

  var isInitiated = false;

  var INPUT_SCALE = 2;
  var INPUT_WIDTH = 320/INPUT_SCALE;
  var INPUT_HEIGHT = 240/INPUT_SCALE;
  var MIN_BLOB_SIDE = 10;
  var VIDEO_FPS = 24;

  tracker.videoCanvas = null;
  var is_webkit = false;
  var videoInput, videoInputCanvas,videoTextureCanvas;
  var fxStacks = [];
  var inputSplitList = [];
  var bufferCanvasStack = [];
  tracker.buffer = bufferCanvasStack;
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
  var smoothedMarkersListX = new Array();
  //var smoothedMarkersListY = new Array();
  var selectPaddleOpen = false;

  var interpolatedX = 0;

  tracker.readBB = new BoundingBox(INPUT_WIDTH,INPUT_HEIGHT)
  tracker.mainBB = new BoundingBox(INPUT_WIDTH,INPUT_HEIGHT)
  tracker.colorBB = new BoundingBox(INPUT_WIDTH,INPUT_HEIGHT)
  tracker.lastOkBB = new BoundingBox(INPUT_WIDTH,INPUT_HEIGHT)

  tracker.init = function(){

    if( isInitiated ) return;
    isInitiated = true;

    camera.on('userMedia', function(stream) {
      this.setTrackingStream(stream);
    }.bind(this));

  }

  tracker.setTrackingStream = function(stream) {
    var source = window.webkitURL ? window.webkitURL.createObjectURL(stream) : stream;

    videoInput = document.getElementById('videoInput');
    videoInput.addEventListener('loadedmetadata', tracker.onVideoFeedReady);
    videoInput.width = INPUT_WIDTH*INPUT_SCALE;
    videoInput.height = INPUT_HEIGHT*INPUT_SCALE;
    videoInput.autoplay = true; // you can set this in your markup instead
    videoInput.src = source;

    tracker.setupElements();
  }

  tracker.updateTrackingColor = function( save ){
    colorMarkerX = INPUT_WIDTH*.5;
    colorMarkerY = INPUT_HEIGHT*.8;

    if(bufferCanvasStack[1]) {
      var c = bufferCanvasStack[1].getContext("2d").getImageData( colorMarkerX, colorMarkerY, 1, 1).data;
      
      if( save ) {
        settings.data.trackingColor = [c[0],c[1],c[2]];
        tracker.emit('colorUpdate',c[0],c[1],c[2]);
        localStorage.setItem("paddleColor", c[0] + ":" + c[1] + ":" + c[2]);
      }
      else {
        settings.data.trackingColorPreview = [c[0],c[1],c[2]];
      }
    }
  }

  tracker.setupElements = function(){

    //fx stacks
    var fxCanvas = fx.canvas();
    $("#monitorFinalContainer").prepend(fxCanvas);
    fxStacks[0] = fxCanvas;

    blobRectCanvas = document.createElement('canvas');
    blobRectCanvas.width = INPUT_WIDTH;
    blobRectCanvas.height = INPUT_HEIGHT;
    blobRectCanvas.getContext("2d").strokeStyle = "#ffffff";
    $("#monitorFinalBlobs").prepend(blobRectCanvas);

    for( var i=0;i<4;i++) {

        var bufferCanvas = document.createElement('canvas');
        bufferCanvas.width = INPUT_WIDTH;
        bufferCanvas.height = INPUT_HEIGHT;
        bufferCanvasStack[i] = bufferCanvas;

        //fill with video
        bufferCanvas.getContext("2d").drawImage(videoInput, 0, 0, INPUT_WIDTH, INPUT_HEIGHT);
    }

  }

  tracker.onVideoFeedReady = function(){

    //create textures
    textures["currentFrame"] = fxStacks[0].texture(INPUT_WIDTH,INPUT_HEIGHT);
    textures["lastFrame"] = fxStacks[0].texture(INPUT_WIDTH,INPUT_HEIGHT);

    tracker.update();

  }

  tracker.update = function() {

    if( videoInput ){

      if(settings.data.inputType == "motion" ) {

        var currentFrameNumber = Math.floor(videoInput.currentTime * VIDEO_FPS);
        if (currentFrameNumber > lastFrameNumber) {
          tracker.doTracking();
          lastFrameNumber = currentFrameNumber;
        }

        interpolatedX += ( markerCurrentX-interpolatedX)*0.6

        tracker.emit('trackerUpdate',interpolatedX,markerCurrentY);
      }
    }

  }

  tracker.doTracking = function(){

     //get data from webcam, save it to first index in buffer
    var selectedBufferCanvas = bufferCanvasStack.splice(bufferCanvasStack.length-1,1)[0];
    selectedBufferCanvas.getContext("2d").drawImage(videoInput, 0, 0, INPUT_WIDTH, INPUT_HEIGHT);
    //TODO change splice to linked list
    bufferCanvasStack.splice(1,0,selectedBufferCanvas);

    textures.currentFrame.loadContentsOf(bufferCanvasStack[1]);
    textures.lastFrame.loadContentsOf(bufferCanvasStack[bufferCanvasStack.length-1]);
    //fx stack 1

    fxStacks[0].draw(textures.lastFrame);
    fxStacks[0].motionBlob(
      textures["currentFrame"],
      20-settings.data.motionBlur,
      settings.data.motionThreshold,
      20-settings.data.trackingColorPreBlur,
      settings.data.trackingColor[0]/255,settings.data.trackingColor[1]/255,settings.data.trackingColor[2]/255,
      settings.data.trackingColorThreshold,
      settings.data.useMotionTracking?1:0,
      INPUT_WIDTH,
      INPUT_HEIGHT
    )

    fxStacks[0].update();

    tracker.blobDetect();

    while( smoothedMarkersListX.length > settings.data.pointSmoothing) {
      smoothedMarkersListX.pop();
    }

    while( smoothedMarkersListX.length < settings.data.pointSmoothing) {
      smoothedMarkersListX.unshift(0);
    }

    smoothedMarkersListX.unshift(markerToX);
//    smoothedMarkersListY.unshift(markerToY);
    smoothedMarkersListX.pop();
  //  smoothedMarkersListY.pop();

    markerCurrentX = tracker.median(smoothedMarkersListX.concat())
    markerCurrentY = markerToY


  }

  tracker.median = function(values) {

    values.sort( function(a,b) {return a - b;} );

    var half = Math.floor(values.length/2);

    if(values.length % 2)
        return values[half];
    else
        return (values[half-1] + values[half]) / 2.0;
  }

  tracker.blobDetect = function() {

    var width = INPUT_WIDTH;
    var height = INPUT_HEIGHT;

    var motionByteArray = fxStacks[0].getPixelArray();

    var len = motionByteArray.length;

    tracker.mainBB.reset();
    tracker.colorBB.reset();

    var currentX;
    var currentY;

    var bUpdate = false;

    var mainPixelsFound = 0;
    var motionPixelsFound = 0;
    var colorPixelsFound = 0;
    //fill blob detection image data

    //TODO Make static variable
    var searchColorChannel = settings.data.useMotionTracking?2:0;

    //start from half height and continue search
    for(var i=0;i<len;i+=4)
    {
      currentX = parseInt((i/4)%INPUT_WIDTH);
      currentY = parseInt((i/4)/INPUT_HEIGHT)

      if( (motionByteArray[i+searchColorChannel] ) > 0 ) {
        tracker.mainBB.test(currentX,currentY)
        mainPixelsFound++
      }

      if( (motionByteArray[i+1] ) > 0 ) {
        motionPixelsFound++
      }

      if( (motionByteArray[i] ) > 0 ) {
        tracker.colorBB.test(currentX,currentY)
        colorPixelsFound++
      }

      //if( tracker.mainBB.miny < tracker.mainBB.initMaxY &&  tracker.mainBB.width > 10 && tracker.colorBB.miny < tracker.colorBB.initMaxY &&  tracker.colorBB.width > 10) break;
    }

    if( settings.data.trackingColorAutoThreshold) {
      if( colorPixelsFound < 80 ) {
        settings.data.trackingColorThreshold += 0.01
      }
      else if( tracker.mainBB.width > 30 ) {
        settings.data.trackingColorThreshold -= 0.01
      }

      if( settings.data.trackingColorThreshold > 0.6) settings.data.trackingColorThreshold = 0.6
      else if( settings.data.trackingColorThreshold < 0.1) settings.data.trackingColorThreshold = 0.1
    }

    //use just color if motion is not enough and color-blob is not to big
    if( motionPixelsFound < colorPixelsFound && tracker.colorBB.width < 80 ) {
      tracker.readBB = tracker.colorBB;
    }
    //else use combo
    else if( tracker.mainBB.width > 10 ) {
      tracker.readBB = tracker.mainBB;
      tracker.lastOkBB = tracker.mainBB.clone();
    }
    else {
      tracker.readBB = tracker.lastOkBB;
    }
    
    //center of blob
    var localX = tracker.readBB.minx + (tracker.readBB.width)/2
    var localY = tracker.readBB.miny;// + (tracker.mainBB.height)/2

    var ctx = blobRectCanvas.getContext("2d");
    ctx.clearRect(0,0,INPUT_WIDTH,INPUT_HEIGHT);
    ctx.strokeRect(tracker.readBB.minx,tracker.readBB.miny,tracker.readBB.width,tracker.readBB.height);

    markerToX = localX / INPUT_WIDTH//*2 - 0.5;
    markerToY = localY / INPUT_HEIGHT;
   
  }

  return tracker;
}

BoundingBox = function(maxx, maxy){
  this.initMaxX = maxx;
  this.initMaxY = maxy;
  this.minx = maxx;
  this.maxx = 0;
  this.miny = this.initMaxY;
  this.maxy = this.initMaxY;
  this.width = this.maxx;
  this.height = this.maxy;
}

BoundingBox.prototype.reset = function(){
  this.minx = this.initMaxX;
  this.maxx = 0;
  this.miny = this.initMaxY;
  this.maxy = this.initMaxY;
}

BoundingBox.prototype.clone = function(){
  var newBB = new BoundingBox();
  newBB.minx = this.minx;
  newBB.maxx = this.maxx;
  newBB.miny = this.miny;
  newBB.maxy = this.maxy;
  newBB.width  = this.width;
  newBB.height  = this.height;
  return newBB;
}

BoundingBox.prototype.test = function(currentX,currentY){
  if( currentX < this.minx ) this.minx = currentX;
  if( currentX > this.maxx ) this.maxx = currentX;
  if( currentY < this.miny ) this.miny = currentY;
  //if( currentY > this.maxy ) this.maxy = currentY;

  this.width = this.maxx - this.minx
  this.height = this.initMaxY - this.miny
}

