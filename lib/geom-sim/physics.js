var debug = require('debug')('physics')
  , History = require('../history')
  , Body = require('./body')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

module.exports = Physics;

function Physics(){
  this.timeStep = 1/60;
  this.history = new History();
}

Physics.prototype = {

  goto: function(frame, world){
    debug('goto',frame)

    // rewind by restore
    if( frame < world.frame )
      return this.history.restore(frame,world);

    // ffw by updates
    while( world.frame < frame )
      this.update(world, this.timeStep);
  },

  update: function(world, timeStep){
    this.timeStep = timeStep;

    var bodies = world.bodies.values
      , forces = world.forces.values;

    for(var j=0; j < bodies.length; j++){
      var a = bodies[j]

      // check bounds
      var hit = oob(world.bounds,a.aabb)
      if( hit ){
        a.onbounds(hit);
        vec.free(hit);
      }

      // check collisions against other bodies
      for(var k=0; k < bodies.length; k++ ){
        if( k === j ) continue; // skip self

        var b = bodies[k];
        var v = vec.sub(a.velocity,b.velocity);
        var c = poly.collides(a.shape, b.shape, v);
        if( c.willIntersect ){

          // DYNAMIC (move out of intersection)
          if( a.flags & Body.DYNAMIC ){
            var t = vec.make()
            vec.add(a.velocity,c.minTranslationVector,t)
            vec.add(a.current,c.minTranslationVector,a.current)
            vec.free(t)
          }

          // GHOST
          if( (a.flags & Body.GHOST) && !(b.flags & Body.STATIC) ){
            console.log("GHOST COLLISION!")
            // just ignoring for now (maybe even skip oncollision())
            // TODO bounce off of STATIC

          // BOUNCE
          } else if( (a.flags & Body.BOUNCE) && (b.flags & Body.BOUNCE) ){
            console.log("BOUNCE!")

            if( b.flags & Body.STEER ){
              console.log("BOUNCE STEER!")
              // divide the diff w. width to get the x normal
              var I = vec.norm(a.velocity)
                , n = vec.perp(c.nearestEdge)
                , r = vec.reflect(I,vec.norm(n,n))
                , l = vec.len(a.velocity)
                , d = (a.current[0] - b.current[0])/(b.aabb[1]-b.aabb[3]);

              // normalizing again to avoid any additional velocity
              r[0] = d
              vec.smul(vec.norm(r,r),l,r)

              // update puck positions
              vec.sub(a.current,r,a.previous)

              vec.free(r)
              vec.free(I)
              vec.free(n)

            } else { // REFLECT
              console.log("BOUNCE REFLECT!")
              var I = vec.norm(a.velocity)
                , n = vec.perp(c.nearestEdge)
                , r = vec.reflect(I,vec.norm(n,n))
                , l = vec.len(a.velocity)
              vec.smul(r,l,r)
              vec.sub(a.current,r,a.previous)
              vec.free(r)
              vec.free(I)
              vec.free(n)

            }
          }

          a.oncollision(b,c);
          vec.free(c.minTranslationVector)
          vec.free(c.nearestEdge)
        }
        vec.free(v)
      }
    }

    // update position
    for(var i=0; i < bodies.length; i++){
      // Apply forces (if any)
      // TODO should this be done before collisions?
      for(var j=0; j < forces.length; j++)
        forces[j].applyForce(bodies[i]);

      bodies[i].update(timeStep);
    }

    // now we're at the next frame
    world.frame += world.direction;

    // store in History
    this.history.save(world);
  }

}

// assumes bounds and aabb = [t,r,b,l]
// if overlap it will return it as a vector
function oob(bounds,aabb){
  var o = vec.make();
  if( aabb[0] < bounds[0] )
    o[1] = bounds[0] - aabb[0];
  if( aabb[1] > bounds[1] )
    o[0] = bounds[1] - aabb[1];
  if( aabb[2] > bounds[2] )
    o[1] = bounds[2] - aabb[2];
  if( aabb[3] < bounds[3] )
    o[0] = bounds[3] - aabb[3];
  if( o[0] !== 0 || o[1] !== 0 )
    return o;
  vec.free(o)
  return null;
}