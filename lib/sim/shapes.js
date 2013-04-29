var geom = require('geom')
  , poly = geom.poly;

exports.rect = function(w,h){
  return poly.make(
    0, 0,
    0, h,
    w, h,
    w, 0
  )
}

exports.oct = function(w){
  return poly.make(
    0,0,
    w*0.5,0,
    w*0.75,w*0.25,
    0.75*w,w*0.75,
    w*0.5,w,
    0,w,
    -0.25*w,w*0.75,
    -0.25*w,w*0.25
  )
}

exports.hex = function(w){
  var hex = poly.make();
  var a = 2 * Math.PI / 6;
  for(var i=5; i >= 0; i--) {
    poly.add(hex, w * Math.cos(i * a), w * Math.sin(i * a));
  }
  poly.close(hex)
  return hex;
}

exports.triangle = function(w,h,side,vertical){
  var triangle = poly.make()
  if(!vertical) {
    poly.add(triangle,0,-h);
    poly.add(triangle,w*(side?1:-1),0);
    poly.add(triangle,0,h);
  } else {
    poly.add(triangle,-w,0);
    poly.add(triangle,0,h*(side?1:-1));
    poly.add(triangle,w,0);
  }
  poly.close(triangle)
  return triangle
}

exports.diamond = function(w){
  var diamond = poly.make()
  var a = 2 * Math.PI / 4;
  for(var i=3; i >= 0; i--) {
    poly.add(diamond, w * Math.cos(i * a), w * Math.sin(i * a) );
  }
  poly.close(diamond)
  return diamond
}
