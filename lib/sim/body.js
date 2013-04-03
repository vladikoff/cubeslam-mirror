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
    this.shape = null //poly.make() (assigned in world.createBody())
    this.aabb = null  //poly.aabb(this.shape)
    this.current = vec.make()
    this.previous = vec.make()
    this.velocity = vec.make()
    this.acceleration = vec.make()
    this.offset = vec.make()
    this.removed = false      // mark as removed upon destroy

    // used in broadphase and should always be
    // the squared distance to the outermost vertex
    // (updated in integration.js)
    this.radiusSq = 0;

    // used by puck to keep track of its active effects
    // and by extras to keep a reference to their
    // options (duration etc.)
    this.data = {}

    // used after a replay to interpolate between the
    // before and after states of the puck and paddle
    //
    //  ex.
    //
    //    {
    //      offset: vec.sub(before.current,after.current),
    //      step: 1/f, // ex 1/10 = .1
    //      frames: f   // ex 10 so
    //    }
    //
    //  this will then be used in integration to set a
    //  body.offset using:
    //
    //      vec.lerp(i.offset,z,i.step*i.frames--,body.offset)
    //
    //  during integration and body.offset will then be added
    //  while rendering. This way the simulation will be jumping
    //  and accurate but the rendering will be smooth and nice.
    //
    this.interpolate = {}

    this.mass = 10;
    this.damping = 1;         // 0-1

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
    vec.free(this.offset)

    // are we done yet?
    if( this.interpolate && this.interpolate.frames ){
      vec.free(this.interpolate.current)
      vec.free(this.interpolate.previous)
    }

    // null them to make sure they fail in case
    // they're accessed again
    this.shape = null
    this.current = null
    this.previous = null
    this.velocity = null
    this.acceleration = null
    this.offset = null
    this.data = null;
    this.interpolate = null;
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