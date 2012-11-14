
var Point = require('./sim/point')
  , MotionTracker = require('./motion-tracker')
  , debug = require('debug')('inputs');

module.exports = Inputs;

var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
var precision = 4;

function Inputs(element){
  this.mouse = new Point();
  this.mouse.last = new Point();
  this.touches = [];

  this.motion = new Point(0,0);
  this.motion.last = new Point();

  this._bindings = {};
  this._down = {};
  this._pressed = {};
  this._released = [];

  var tracker = new MotionTracker();
  tracker.on('colorUpdate',function(r,g,b){console.log('got some color',r,g,b)})
  tracker.on('videoTexture',function(canvas){ this.videoTexture = canvas }.bind(this))
  tracker.on('trackerUpdate',ontrackermove.bind(this))
  tracker.init();
  this.tracker = tracker;

  element && this.setElement(element);
}

Inputs.prototype = {

  setElement: function(element){
    // TODO clear out any old event listeners...

    if( document ){
      // handle browser mouse events
      element.addEventListener('mousewheel', onmousewheel.bind(this), false);
      element.addEventListener('mousemove', onmousemove.bind(this), false);
      //element.addEventListener('mousedown', onkeydown.bind(this), false);
     // document.addEventListener('mouseup', onkeyup.bind(this), false);
      document.addEventListener('contextmenu', oncontextmenu.bind(this), false);

      // handle browser keyboard events
      document.addEventListener('keydown', onkeydown.bind(this), false);
      document.addEventListener('keyup', onkeyup.bind(this), false);
    }
    return this;
  },

  getUserMedia: function(options){
    console.log('requesting user media')
    if( getUserMedia ){
      getUserMedia.call(navigator, options, onUserMediaSuccess.bind(this), onUserMediaError.bind(this));
    
    // moms, dads, grandmas, and grandpas
    } else {
        alert("sorry, no webcam support.")
    }
  },

  bind: function(key,action){
    if( !key ) throw new Error('invalid key to bind '+action)
    this._bindings[key] = action;
    debug('bind',key,action)
    return this;
  },

  pressed: function(action){
    return this._pressed[action];
  },

  released: function(action){
    return ~this._released.indexOf(action);
  },

  down: function(action){
    return this._down[action];
  },

  reset: function(){
    this.mouse.moved = false;
    this.motion.moved = false;
    this.tracker.update();

    for( var action in this._released )
      this._down[action] = false;
    this._released = []
    this._pressed = {}
  }
}

function onUserMediaSuccess(stream){

  $('#cameraRequestAttention').fadeOut();

  console.log('user media success!')
  this.userMedia = stream;
  this.tracker.setTrackingStream(stream);
}

function onUserMediaError(e){

  $('#cameraRequestAttention').fadeOut();

  console.log('user media error!')
  console.error(e)
}

function ontrackermove(x,y){
  if( x !== this.motion.x || y !== this.motion.y ){
    this.motion.last.set(this.motion);
    this.motion.set(x,y).fix(precision);
    this.motion.moved = true;
  }
}

function oncontextmenu(e){
  if( this._bindings[inputs.RIGHT] ){
    e.stopPropagation()
    e.preventDefault()
  }
}

function onmousewheel(e){
  onkeydown.call(this,e); 
  onkeyup.call(this,e)
}

function onmousemove(e){
  if( this.mouse.moved ) return;
  this.mouse.last.set(this.mouse);

  // scale mouse position to a 0-1 position (to match "motion")
  this.mouse.set(e.pageX,e.pageY).div(window.innerWidth,window.innerHeight).fix(precision);
  this.mouse.x = this.mouse.x;
  this.mouse.moved = true;
}

function onkeydown(e){
  var action = this._bindings[eventCode(e)];
  if( !action ) return debug('ignoring key down',eventCode(e));
  if( !this.down[action] )
    this._pressed[action] = true;
  this._down[action] = true;
  // e.stopPropagation()
  e.preventDefault()
}

function onkeyup(e){
  var action = this._bindings[eventCode(e)];
  if( !action ) return debug('ignoring key up',eventCode(e),this._bindings);
  this._released.push(action)
  // e.stopPropagation()
  e.preventDefault()
}


var inputs = {
  LEFT: -1,
  MIDDLE: -2,
  RIGHT: -3,
  WHEELDOWN: -4,
  WHEELUP: -5,

  TAB: 9,
  ENTER: 13,
  ESC: 27,
  SPACE: 32,
  LEFT_ARROW: 37,
  UP_ARROW: 38,
  RIGHT_ARROW: 39,
  DOWN_ARROW: 40
}

// add numbers [0-9]
for(var c=48; c < 57; c++)
  inputs[String.fromCharCode(c)] = c;

// add uppercase ascii letters [A-Z]
for(var c=65; c < 90; c++)
  inputs[String.fromCharCode(c)] = c;

// expose shortcuts on prototype
for(var c in inputs)
  Inputs.prototype[c] = inputs[c];

function eventCode(e){
  if( e.type == 'keydown' || e.type == 'keyup' ){
    return e.keyCode
  } else if( e.type == 'mousedown' || e.type == 'mouseup' ){
    switch(e.button){
      case 0: return inputs.LEFT; break;
      case 1: return inputs.MIDDLE; break;
      case 2: return inputs.RIGHT; break;
    }
  } else if( e.type == 'mousewheel' ){
    if( e.wheel > 0 )
      return inputs.WHEELUP
    else
      return inputs.WHEELDOWN
  }
  console.warn('invalid event',e)
}
