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


exports.hex = function(w){
  var hex = poly.make()
  var a = 2 * Math.PI / 6;
  for(var i=5; i >= 0; i--)
    poly.add(hex, w * Math.cos(i * a), w * Math.sin(i * a) );
  poly.close(hex)
  return hex;
}