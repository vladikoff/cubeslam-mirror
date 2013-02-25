var debug = require('debug')('sim:body')
  , BodyFlags = require('./body-flags')
  , Pool = require('../support/pool')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

module.exports = Body;

function Body(){}

Body.prototype = {

  alloc: function(){
    debug('alloc')
    this.shape = poly.make()
    this.aabb = poly.aabb(this.shape)
    this.current = vec.make()
    this.previous = vec.make()
    this.velocity = vec.make()
    this.acceleration = vec.make()
    this.removed = false      // mark as removed upon destroy

    // used by puck to keep track of its active effects
    // and by extras to keep a reference to their
    // options (duration etc.)
    this.data = {}

    this.mass = 10;
    this.damping = 1;       // 0-1

    this.removed = false      // mark as removed upon destroy
    this.id = null            // used by icons/extras
    this.index = -1;          // will be set in world.createBody()
  },

  free: function(){
    debug('free')
    poly.free(this.shape)
    vec.free(this.current)
    vec.free(this.previous)
    vec.free(this.velocity)
    vec.free(this.acceleration)

    // null them to make sure they fail in case
    // they're accessed again
    this.shape = null
    this.current = null
    this.previous = null
    this.velocity = null
    this.acceleration = null
    this.data = null;
  },

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

Pool(Body,20)