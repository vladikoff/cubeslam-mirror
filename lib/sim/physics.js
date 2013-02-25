var debug = require('debug')('physics')
  , settings = require('../settings')
  , collisions = require('./collisions')
  , integration = require('./integration')
  , BodyFlags = require('./body-flags')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

module.exports = Physics;

function Physics(){
  this.bounds = [0,settings.data.arenaWidth,settings.data.arenaHeight,0];
  this.removed = [];
}

Physics.prototype = {

  update: function(world, timeStep){
    if( world.state !== 'preview' && world.state !== 'playing' )
      return;

    var bodies = world.bodies.values
      , forces = world.forces.values;

    // console.log('physics update frame: %s bodies: %s',world.frame,world.bodies.length)

    for(var j=0; j < bodies.length; j++){
      var a = bodies[j]

      // // skip removed bodies
      if( a.removed ){
        this.removed.push(a);
        continue;
      }



      // check collisions against other bodies
      for(var k=0; k < bodies.length; k++ ){
        if( k === j ) continue; // skip self

        var b = bodies[k];

        // skip removed bodies
        // cannot skip this or the puck will go through
        // the shields...???
        // if( b.removed ){
        //   this.removed.push(b);
        //   continue;
        // }

        // skip shield > shield collisions
        if( b.id == 'shield' && b.id == a.id )
          continue;

        // skip shield > paddle collisions
        if( b.id == 'shield' && a.id == 'paddle' )
          continue;

        // skip paddle > shield collisions
        if( b.id == 'paddle' && a.id == 'shield' )
          continue;

        var v = vec.sub(a.velocity,b.velocity);
        var c = poly.collides(a.shape, b.shape, v);
        if( c.willIntersect ){

          // GHOST
          if( BodyFlags.has(a,BodyFlags.GHOST) && !BodyFlags.has(b,BodyFlags.STATIC) ){
            // console.log("GHOST COLLISION!")
            // just ignoring for now (maybe even skip oncollision() ?)
            // TODO bounce off of STATIC

          // BOUNCE
          } else if( BodyFlags.has(a,BodyFlags.BOUNCE) && BodyFlags.has(b,BodyFlags.BOUNCE) ){
            // console.log("BOUNCE!")

              // DYNAMIC (move out of intersection)
            if( !BodyFlags.has(a,BodyFlags.STATIC) && BodyFlags.has(b,BodyFlags.STATIC) ){
              var t = vec.make()
              vec.add(a.velocity,c.minTranslationVector,t)
              vec.add(a.current,c.minTranslationVector,a.current)
              vec.free(t)
            }

            if( BodyFlags.has(b,BodyFlags.STEER) ){
              // console.log("BOUNCE STEER!")
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
              // console.log("BOUNCE REFLECT!")
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
          } else {
            // console.log('collision flags:')
            // console.log(' %s:',a.id,Body.flags(a._flags))
            // console.log(' %s:',b.id,Body.flags(b._flags))
            // console.log('')
          }

          // if( BodyFlags.has(b,BodyFlags.DESTROY) )
          //   world.releaseBody(b);


          collisions.oncollision(world,a,b,c);
          vec.free(c.minTranslationVector)
          vec.free(c.nearestEdge)

          if( a.removed )
            this.removed.push(a);

          if( b.removed )
            this.removed.push(b);
        }
        vec.free(v)
      }

      // check bounds
      var hit = oob(this.bounds,a.aabb)
      if( hit ){
        collisions.onbounds(world,a,hit);
        vec.free(hit);

        // skip removed bodies
        if( a.removed ){
          this.removed.push(a);
          continue;
        }
      }

    }

    // clean out removed bodies
    // doing this after the collision loop
    // so we don't modify the world.bodies
    // array within the loop
    var r;
    while(r = this.removed.pop()){
      // already destroyed if current == null...
      if( r.current )
        world.destroyBody(r);
    }


    // precalculate squared timestep
    var tsq = timeStep * timeStep;

    // update position
    for(var i=0; i < bodies.length; i++){
      // static bodies are not affected
      if( BodyFlags.has(bodies[i],BodyFlags.STATIC) )
        continue;

      // Apply forces (if any)
      // TODO or should this be done before collisions?
      for(var j=0; j < forces.length; j++)
        integration.force(forces[j],bodies[i]);

      integration.body(bodies[i],tsq)
    }
    // now we're at the next frame
    world.frame += 1;
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