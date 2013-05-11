var Emitter = require('emitter')
  , debug = require('debug')('mouse')

var mx, my
  , px, py
  , cx, cy
  , pt
  , element = document;

Emitter(exports)

var u; // = undefined!

exports.tick = function(){
  var t = Date.now()
    , dt = t-pt;
  if( (px !== u && py !== u) && (mx !== px || my !== py) )
    exports.emit('move',mx-px,my-py,dt)
  if( cx && cy )
    exports.emit('click',cx,cy,dt)
  px = mx; py = my; pt = t;
  cx = cy = null;
}

exports.start = function(el){
  debug('start',el)
  if( el ) element = el;
  element.addEventListener('touchstart',touchStart,true)
  element.addEventListener('touchmove',touchMove,true)
  element.addEventListener('mousemove',move,true)
  element.addEventListener('click',click,true)
}

exports.stop = function(){
  debug('stop')
  mx = px;
  my = py;
  element.removeEventListener('touchstart',touchStart,true)
  element.removeEventListener('touchmove',touchMove,true)
  element.removeEventListener('mousemove',move,true)
  element.removeEventListener('click',click,true)
}

function move(e){
  mx = e.pageX; my = e.pageY;
}

function click(e){
  cx = e.pageX; cy = e.pageY;
}

function touchStart(e){
  var t = e.touches[0];
  if( t ){
    px = mx = t.pageX;
    py = my = t.pageY;
  }
}

function touchMove(e){
  var t = e.touches[0];
  if( t ){
    mx = t.pageX;
    my = t.pageY;
    // exports.tick();
  }
  e.preventDefault()
}