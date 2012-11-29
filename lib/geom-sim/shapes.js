

exports.rect = function(w,h){
  return poly.make(
    0, 0,
    0, h,
    w, h,
    w, 0
  )
}