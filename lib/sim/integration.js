var debug = require('debug')('sim:integration')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

// a temporary vector only required during the
// update and not supposed to be available to
// others
var next = vec.make()

// a 0,0 vector that can be copied from without
// allocating any array of vector.
var zero = vec.make()

// verlet integration
exports.body = function(body,tsq){
  var c = body.current
    , p = body.previous
    , v = body.velocity
    , a = body.acceleration
    , o = body.offset
    , i = body.interpolate
    , t = body.target
    , n = next
    , z = zero;

  // velocity = target - current
  if( t && t.position ){
    var tc = vec.sub(t.position,c)
    vec.sdiv(tc,t.frames--,v)
    vec.free(tc)
    if( t.frames == 0 ){
      vec.free(t.position)
      t.frames = 0;
      t.position = null;
    }

  // velocity = current - previous
  } else {
    vec.sub(c,p,v)
  }

  // damping
  if( body.damping !== 1 ){
    // damp until
    // resets damping when the velocity of the body
    // is lower than dampUntil^2
    var duSq = body.dampUntil*body.dampUntil
      , vSq = duSq && v[0]*v[0]+v[1]*v[1];
    if( duSq && duSq > vSq ){
      // console.log('stopping damping')
      body.damping = 1;
      delete body.dampUntil;
    } else {
      vec.smul(v,body.damping,v);
    }
  }

  // next = current + velocity + acceleration/2 * (timestep*timestep)
  n[0] = c[0] + v[0] + .5 * a[0] * tsq
  n[1] = c[1] + v[1] + .5 * a[1] * tsq

  vec.copy(c,p)     // previous = current
  vec.copy(n,c)     // current = next
  vec.copy(z,a)     // reset acceleration

  // replay interpolation
  // updates body.offset
  if( i && i.frames ){
    i.frames--
    vec.lerp(z,i.offset,i.step*i.frames,o)
    // console.log('applied interpolation to %s over %s frames',body.index,i.frames,i.offset.join(','),o.join(','))
    if( i.frames <= 0 ){
      // console.log('interpolation completed %s',o.join(','))
      vec.copy(z,o) // reset offset
      vec.free(i.offset)
      i.offset = null
      i.frames = null
    }
  }

  // update the shape
  move(body.shape,c)
  poly.aabb(body.shape,body.aabb)
}


exports.force = function(force,body){
  if( !force.active )
    return;

  switch( force.type ){

    case 'attract':
      var diff = vec.sub(force.position, body.current)
        , distSq = vec.lenSq(diff)
        , radiSq = force.radius*force.radius;
      if( distSq < radiSq ){
        // limit the distsq to avoid insane speeds
        // when it gets too close to the center.
        distSq = Math.max(100,distSq)
        var f = (body.mass*force.mass)/distSq*force.power;
        f = Math.min(.65, f)
        var d = Math.sqrt(distSq);
        exports.bodyForce(body, f * diff[0]/d, f * diff[1]/d);
      }
      vec.free(diff)
      break;

    case 'repell':
      var diff = vec.sub(force.position, body.current)
        , distSq = vec.lenSq(diff)
        , radiSq = force.radius*force.radius;
      if( distSq < radiSq ){
        // limit the distsq to avoid insane speeds
        // when it gets too close to the center.
        distSq = Math.max(100,distSq)
        var f = (body.mass*-force.mass)/distSq*force.power;
        var d = Math.sqrt(distSq);
        exports.bodyForce(body, f * diff[0]/d, f * diff[1]/d);
      }
      vec.free(diff)
      break;

    default:
      throw new Error('invalid force')
  }
}

exports.bodyForce = function(body,x,y){
  var invMass = 1/body.mass;
  var f = vec.make(x*invMass,y*invMass)
  vec.add(body.acceleration, f, body.acceleration);
  vec.free(f)
}


var EPS = 1e-12;
function eps(x){ return Math.round(x/EPS) * EPS }

function move(shape,to){
  var c = poly.centroid(shape)
  var d = vec.sub(to,c)
  poly.translate(shape, d[0] ,d[1]);
  vec.free(c)
  vec.free(d)
}

// [t,r,b,l]
function center(aabb){
  return vec.make((aabb[2]-aabb[0])/2,(aabb[1]-aabb[3])/2)
}
