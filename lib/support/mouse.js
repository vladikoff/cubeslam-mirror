var Emitter = require('emitter')

var mx, my
  , px, py
  , cx, cy
  , pt;

Emitter(exports)

exports.tick = function(){
  var t = Date.now()
    , dt = t-pt;
  if( mx !== px || my !== py )
    exports.emit('move',mx-px,my-py,dt)
  if( cx && cy )
    exports.emit('click',cx,cy,dt)
  px = mx; py = my; pt = t;
  cx = cy = null;
}

exports.start = function(){
  document.addEventListener('touchmove',touchMove,true)
  document.addEventListener('mousemove',move,true)
  document.addEventListener('click',click,true)
}

exports.stop = function(){
  document.removeEventListener('touchmove',touchMove,true)
  document.removeEventListener('mousemove',move,true)
  document.removeEventListener('click',click,true)
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