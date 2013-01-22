var debug = require('debug')('sim:body')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

module.exports = Body;

var index = 0;

// check if flag is on with:
//    if( body.flags & Body.GHOST ) bla;
// turn on:
//    flags |= GHOST
// turn off:
//    flags &= ~GHOST
// toggle:
//    flags ^= GHOST
// combine flags when created with:
//    new Body(shape,x,y,Body.IMMOVABLE | Body.GHOST | Body.AWESOME)

// add more flags by increasing the right integer (1<<2, 1<<3 etc)
Body.DYNAMIC = 0 << 0;  // moves around
Body.STATIC  = 1 << 0;  // stays put
Body.DESTROY = 1 << 1;  // removed when hit
Body.BOUNCE  = 1 << 2;  // will bounce off of anything that is BOUNCE and STEER or REFLECT
Body.GHOST   = 1 << 3;  // passes through anything that is DYNAMIC
Body.REFLECT = 0 << 4;  // reflects based on shape normal
Body.STEER   = 1 << 4;  // reflects based on hit position

// TODO FIREBALL?

// example definitions:
// DEFAULT = DYNAMIC
// BULLET = DYNAMIC | DESTROY
// PUCK = DYNAMIC | BOUNCE
// MULTI_PUCK = PUCK | DESTROY
// GHOST_PUCK = PUCK | GHOST
// PADDLE = DYNAMIC | BOUNCE | STEER
// BRICK = STATIC | BOUNCE | DESTROY | REFLECT
// OBSTACLE = STATIC | BOUNCE | REFLECT
// EXTRA = STATIC | DESTROY


function Body(shape,x,y,flags){
  this.index = index++; // globally unique index
  this.shape = poly.copy(shape)
  this.aabb = poly.aabb(this.shape)
  this.current = vec.make(x,y)
  this.previous = vec.make(x,y)
  this.velocity = vec.make()
  this.acceleration = vec.make()
  this.id = null // used by icons/extras/paddle/puck/bullet

  this.mass = 1;
  this.damping = 1;       // 0-1
  this._flags = 0;
  this.setFlags(flags || 0);

  // events instead? this is faster though...
  this.onbounds = noop;
  this.oncollision = noop;

  // place the shape correctly
  move(this.shape,this.current)
}

Body.getNextIndex = function(){
  return index+1;
}

// returns any flags as a string
Body.flags = function(f){
  if( typeof f != 'number' )
    throw new ArgumentError('invalid flags, must be a number')
  var s = []
  if( f & Body.STATIC )
    s.push('STATIC');
  else
    s.push('DYNAMIC');
  if( f & Body.DESTROY )
    s.push('DESTROY');
  if( f & Body.BOUNCE )
    s.push('BOUNCE');
  if( f & Body.GHOST )
    s.push('GHOST');
  if( f & Body.STEER )
    s.push('STEER');
  else
    s.push('REFLECT');
  return s.join(' | ')
}



// a temporary vector only required during the
// update and not supposed to be available to
// others
var next = vec.make()

// a 0,0 vector that can be copied from without
// allocating any array of vector.
var zero = vec.make()

Body.prototype = {

  update: function(timeStep){
    var tsq = timeStep * timeStep;

    var c = this.current
      , p = this.previous
      , v = this.velocity
      , a = this.acceleration
      , n = next
      , z = zero;

    // verlet integration
    vec.sub(c,p,v)    // velocity = current - previous

    // damping
    if( this.damping !== 1 )
      vec.smul(v,this.damping,v);

    // next = current + velocity + acceleration/2 * (timestep*timestep)
    n[0] = c[0] + v[0] + .5 * a[0] * tsq
    n[1] = c[1] + v[1] + .5 * a[1] * tsq

    vec.copy(c,p)     // previous = current
    vec.copy(n,c)     // current = next
    vec.copy(z,a)     // reset acceleration

    // update the shape
    move(this.shape,c)
    this.aabb = poly.aabb(this.shape)
  },

  setFlags: function(flags){
    debug('set flags',this.id,Body.flags(flags))
    this._flags = flags;
  },

  hasFlags: function(flags){
    // debug('has flags',Body.flags(flags))
    return this._flags & flags;
  },

  addFlags: function(flags){
    debug('add flags',this.id,Body.flags(flags))
    this._flags |= flags;
  },

  delFlags: function(flags){
    debug('del flags',this.id,Body.flags(flags))
    this._flags &= ~flags;
  },

  get flags(){
    throw new Error('do not')
  },
  set flags(){
    throw new Error('do not')
  },

  applyForce: function(x,y){
    var invMass = 1/this.mass;
    var f = vec.make(x*invMass,y*invMass)
    vec.add(this.acceleration, f, this.acceleration);
    vec.free(f)
  },

  toString: function(inclFlags){
    var str = '{'
    +' c:'+this.current.join(',')
    +' p:'+this.previous.join(',')
    +' v:'+this.velocity.join(',')
    +' a:'+this.acceleration.join(',');

    if( inclFlags )
      str += ' flags:'+Body.flags(this._flags);

    return str +' }'
  }

}

function noop(){};

function move(shape,to){
  var c = poly.centroid(shape)
  var d = vec.sub(to,c)
  poly.translate(shape, d[0] ,d[1]);
  vec.free(c)
  vec.free(d)
}