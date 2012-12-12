var geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

module.exports = Body;

var index = 0;

function Body(shape,x,y,fixed){
  this.index = index++; // globally unique index
  this.shape = poly.copy(shape)
  this.aabb = poly.aabb(this.shape)
  this.current = vec.make(x,y)
  this.previous = vec.make(x,y)
  this.velocity = vec.make()
  this.acceleration = vec.make()
  this.id = null // used by icons/extras/paddle/puck/bullet

  // TODO use mass somewhere
  this.mass = 1;
  this.damping = 1;       // 0-1
  this.fixed = fixed === true;

  // events instead? this is faster though...
  this.onbounds = noop;
  this.oncollision = noop;

  // place the shape correctly
  move(this.shape,this.current)
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

  applyForce: function(x,y){
    var invMass = 1/this.mass;
    var f = vec.make(x*invMass,y*invMass)
    vec.add(this.acceleration, f, this.acceleration);
    vec.free(f)
  },

  toString: function(){
    return '{'
    +' c:'+this.current.join(',')
    +' p:'+this.previous.join(',')
    +' v:'+this.velocity.join(',')
    +' a:'+this.acceleration.join(',')
    +' }'
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