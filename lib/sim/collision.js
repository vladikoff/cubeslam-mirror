var debug = require('debug')('sim:collision')
  , settings = require('../settings')
  , actions = require('../actions')
  , BodyFlags = require('./body-flags')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;


module.exports = function collision(world,a,b,c){
  // console.log('collides:')
  // console.log('  a: %s:%s (%s)',a.id,a.index,BodyFlags.toString(a._flags))
  // console.log('  b: %s:%s (%s)',b.id,b.index,BodyFlags.toString(b._flags))

  // GHOST
  if( BodyFlags.has(a,BodyFlags.GHOST) && !BodyFlags.has(b,BodyFlags.STATIC) ){
    // console.log("GHOST COLLISION!")
    // just ignoring for now
    // but maybe even skip oncollision()?
    // and should it bounce off of STATICs?
    return;

  // BOUNCE
  } else if( BodyFlags.has(a,BodyFlags.BOUNCE) && BodyFlags.has(b,BodyFlags.BOUNCE) ){


    // currently intersecting. move apart
    // but don't change the velocity (it should be done below depending on flags)
    // also updates shape so it shouldn't collide again
    // (but it still will in case it's in the willCollide array multiple times)
    // TODO can this "move apart"-thing be applied too many times then?
    var t = c.minTranslationVector;
    if( c.intersect ){
      // console.log('intersecting, will move apart by %s',t.join(','))
      vec.add(a.previous,t,a.previous);
      vec.add(a.current,t,a.current);
      poly.translate(a.shape, t[0] ,t[1]);
      poly.aabb(a.shape,a.aabb);

      // TODO if one is STATIC the other should be pushed. if both are DYNAMIC (!STATIC)
      //      a should add t * .5 and b sub t * .5. (see http://elancev.name/oliver/2D%20polygon.htm)
      if( BodyFlags.has(a,BodyFlags.STATIC) || BodyFlags.has(b,BodyFlags.STATIC) ){
        console.warn('TODO push them apart by 50%')
      }

    } else {
      // we know now that it will intersect. but we don't know exactly when...

    }

    if( BodyFlags.has(b,BodyFlags.DIRECT) ){
      // console.log("BOUNCE DIRECT!")
      var I = vec.norm(a.velocity)
        , n = vec.perp(c.nearestEdge)
        , r = vec.reflect(I,vec.norm(n,n))
        , l = vec.len(a.velocity);

      // add the x-velocity of the paddle to the reflection angle
      var d = b.velocity[0] / 10;
      r[0] += d;

      r[0] /= 4;

      // normalizing again to avoid any additional velocity
      vec.smul(vec.norm(r,r),l,r)

      // update puck positions
      vec.sub(a.current,r,a.previous)

      // update velocity (which is used to check for other collisions)
      vec.copy(r,a.velocity)

      vec.free(r)
      vec.free(I)
      vec.free(n)


    } else if( BodyFlags.has(b,BodyFlags.STEER) ){
      // console.log("BOUNCE STEER!")
      // divide the diff w. width to get the x normal
      var I = vec.norm(a.velocity)
        , n = vec.perp(c.nearestEdge)
        , r = vec.reflect(I,vec.norm(n,n))
        , l = vec.len(a.velocity)
        , d = (a.current[0] - b.current[0])/(a.aabb[1]-b.aabb[3]);

      // divide to make it less horizontal when
      // we have momentum than without momentum
      r[0] = settings.data.paddleMomentum
             ? d/settings.data.steerWidthMomentum
             : d/settings.data.steerWidth;

      // normalizing again to avoid any additional velocity
      vec.smul(vec.norm(r,r),l,r)

      // update puck positions
      vec.sub(a.current,r,a.previous)

      // update velocity (which is used to check for other collisions)
      vec.copy(r,a.velocity)

      vec.free(r)
      vec.free(I)
      vec.free(n)

    } else { // REFLECT
      // console.log("BOUNCE REFLECT!",a.id,a.index)
      var I = vec.norm(a.velocity)
        , n = vec.perp(c.nearestEdge)
        , r = vec.reflect(I,vec.norm(n,n))
        , l = vec.len(a.velocity)

      // make sure it has the original velocity
      vec.smul(r,l,r)

      // console.log('before reflect')
      // console.log(' c:',a.current)
      // console.log(' p:',a.previous)
      // console.log(' v:',a.velocity)

      // update puck positions
      vec.sub(a.current,r,a.previous)

      // update velocity (which is used to check for other collisions)
      vec.sub(a.current,a.previous,a.velocity)

      // console.log('after reflect')
      // console.log(' c:',a.current)
      // console.log(' p:',a.previous)
      // console.log(' v:',a.velocity)

      vec.free(r)
      vec.free(I)
      vec.free(n)
    }
  }

  // handle the collision based on
  // body types
  switch(a.id){
    case 'puck':
      switch(b.id){
        case 'extra': return actions.hitPuckExtra(world,a,b);
        case 'paddle': return actions.hitPuckPaddle(world,a,b);
        case 'shield': return actions.hitPuckShield(world,a,b);
        case 'obstacle': return actions.hitPuckObstacle(world,a,b);
      }
      return console.warn('unknown collision between %s and %s',a.id,b.id)

    case 'bullet':
      switch(b.id){
        case 'paddle': return actions.hitBulletPaddle(world,a,b);
        case 'obstacle': return actions.hitBulletObstacle(world,a,b);
      }
      return console.warn('unknown collision between %s and %s',a.id,b.id)
  }
}