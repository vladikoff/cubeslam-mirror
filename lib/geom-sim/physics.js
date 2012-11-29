var debug = require('debug')('physics')
  , History = require('../sim/history')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;


module.exports = Physics;

function Physics(){
  this.constraintAccuracy = 3;
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

    var bodies = world.bodies
      , forces = world.forces;

    // solve constraints
    // TODO necessary?
    for(var i=0; i < this.constraintAccuracy; i++){

      for(var j=0; j < bodies.length; j++){
        var a = bodies[j]

        // check bounds
        var hit = oob(world.bounds,a.aabb)
        if( hit ){
          body.onbounds(hit);
          vec.free(hit);
        }

        // check collisions against other bodies
        for(var k=0; k < bodies.length; k++ ){
          if( k === j ) continue; // skip self

          var b = bodies[k];
          var v = vec.sub(p.velocity,q.velocity);
          var c = poly.collides(a.shape, b.shape, v);
          if( c.willIntersect ){
            a.oncollide(b,c);
            vec.free(c.minTranslationVector)
            vec.free(c.nearestEdge)
          }
          vec.free(v)
        }
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
  if( b[0] < aabb[0] )
    o[1] = aabb[0] - b[0];
  if( b[1] > aabb[1] )
    o[0] = aabb[1] - b[1];
  if( b[2] > aabb[2] )
    o[1] = aabb[2] - b[2];
  if( b[3] < aabb[3] )
    o[0] = aabb[3] - b[3];
  if( o[0] !== 0 || o[1] !== 0 )
    return o;
  vec.free(o)
  return null;
}