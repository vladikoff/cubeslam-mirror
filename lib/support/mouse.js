var Emitter = require('emitter')

var mx, my
  , px, py
  , cx, cy
  , pt
  , element = document;

Emitter(exports)

exports.tick = function(){
  var t = Date.now()
    , dt = t-pt;

  if( px !== undefined && (mx !== px || my !== py) )
    exports.emit('move',mx-px,my-py,dt)
  if( cx && cy )
    exports.emit('click',cx,cy,dt)
  px = mx; py = my; pt = t;
  cx = cy = null;
}

exports.start = function(el){
  if( el ) element = el;
  element.addEventListener('touchmove',touchMove,true)
  element.addEventListener('mousemove',move,true)
  element.addEventListener('click',click,true)
}

exports.stop = function(){
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

function touchMove(e){
  var t = e.touches[0];
  if( t ){
    mx = t.pageX; my = t.pageY;
  }
  e.preventDefault()
}