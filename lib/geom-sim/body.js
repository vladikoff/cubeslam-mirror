var debug = require('debug')('sim:body')
  , BodyFlags = require('./body-flags')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

module.exports = Body;

function Body(shape,x,y,flags){
  this.index = -1;
  this.shape = poly.copy(shape)
  this.aabb = poly.aabb(this.shape)
  this.current = vec.make(x,y)
  this.previous = vec.make(x,y)
  this.velocity = vec.make()
  this.acceleration = vec.make()
  this.removed = false // mark as removed upon destroy (not currently used)
  this.id = null // used by icons/extras/paddle/puck/bullet

  this.mass = 1;
  this.damping = 1;       // 0-1
  BodyFlags.set(this,flags || 0);

  // place the shape correctly
  move(this.shape,this.current)
}

Body.prototype = {

  toString: function(inclFlags){
    var str = '{'
    +' c:'+this.current.join(',')
    +' p:'+this.previous.join(',')
    +' v:'+this.velocity.join(',')
    +' a:'+this.acceleration.join(',');

    if( inclFlags )
      str += ' flags:'+BodyFlags.toString(this._flags);

    return str +' }'
  }

}

function move(shape,to){
  var c = poly.centroid(shape)
  var d = vec.sub(to,c)
  poly.translate(shape, d[0] ,d[1]);
  vec.free(c)
  vec.free(d)
}