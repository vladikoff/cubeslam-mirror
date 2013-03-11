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

exports.body = function(body,tsq){
  var c = body.current
    , p = body.previous
    , v = body.velocity
    , a = body.acceleration
    , o = body.offset
    , i = body.interpolate
    , n = next
    , z = zero;

  // verlet integration
  vec.sub(c,p,v)    // velocity = current - previous

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
    // console.log('applying interpolation to %s over %s frames',body.index,i.frames,i.offset.join(','),o.join(','))
    vec.lerp(i.offset,z,i.step*i.frames--,o)
    if( i.frames <= 0 ){
      vec.free(i.offset)
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
        , dist = vec.lenSq(diff);
      if( dist < force.radius*force.radius ){
        // var f = Math.pow(1-dist/force.mass,force.power) * -force.mass;
        // 100 = converting m to cm ?
        // var f = 100 * (force.mass * body.mass) / dist;
        var f = dist / force.radius * force.mass * force.power;
        var d = Math.atan2(diff[1],diff[0]);
        exports.bodyForce(body, f * Math.cos(d), f * Math.sin(d));
      }
      vec.free(diff)
      break;

    case 'repell':
      var diff = vec.sub(force.position, body.current)
        , dist = vec.lenSq(diff);
      if( dist < force.radius*force.radius ){
        var f = (1-dist / force.radius) * force.mass * force.power;
        var d = Math.atan2(diff[1],diff[0]);
        exports.bodyForce(body, f * Math.cos(d), f * Math.sin(d));
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