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

    // used after a replay to interpolate between the
    // before and after states of the puck and paddle
    //
    //  ex.
    //
    //    {
    //      current: vec.sdiv(vec.sub(after.current,before.current),f),
    //      previous: vec.sdiv(vec.sub(after.previous,before.previous),f),
    //      frames: f
    //    }
    //
    //  then in integration.js, if body.interpolate exists
    //  it should do something like:
    //
    //    if( i.frames ){
    //      var cv = vec.add(v,i.current)
    //      var pv = vec.add(v,i.previous)
    //      vec.add(c,cv,c)
    //      vec.add(p,pv,p)
    //      vec.free(cv)
    //      vec.free(pv)
    //      i.frames--
    //      if( i.frames <= 0 ){
    //        vec.free(i.current)
    //        vec.free(i.previous)
    //        delete i.current
    //        delete i.previous
    //        delete i.frames
    //      }
    //    }
    //
    //  current(5) + step(1) + diff(10-5)/frames(10) = 6.5
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