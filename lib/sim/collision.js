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
  if( (BodyFlags.has(a,BodyFlags.GHOST) && !BodyFlags.has(b,BodyFlags.STATIC)) ||
      (BodyFlags.has(b,BodyFlags.GHOST) && !BodyFlags.has(a,BodyFlags.STATIC))){
    // console.log("GHOST COLLISION!")
    // just ignoring for now
    // but maybe even skip oncollision()?
    // and should it bounce off of STATICs?
    return;

  // BOUNCE
  } else if( BodyFlags.has(a,BodyFlags.BOUNCE) && BodyFlags.has(b,BodyFlags.BOUNCE) ){

    // currently intersecting. move apart
    // but don't change the velocity (it will be done below depending on flags)
    if( c.intersect ){
      fixIntersection(world,a,b,c)
    }

    if( BodyFlags.has(b,BodyFlags.DIRECT) ){
      bounceDirect(world,a,b,c)

    } else if( BodyFlags.has(b,BodyFlags.STEER) ){
      bounceSteer(world,a,b,c)

    } else {
      bounceReflect(world,a,b,c)
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

function fixIntersection(world,a,b,c){
  var t = c.minTranslationVector;

  // if both are DYNAMIC `a` should + t*.5 and `b` - t*.5.
  // (see http://elancev.name/oliver/2D%20polygon.htm)
  if( a.id !== "paddle" && b.id !== "paddle" && !BodyFlags.has(a,BodyFlags.STATIC) && !BodyFlags.has(b,BodyFlags.STATIC) ){
    // split t in half
    t[0] = t[0]/2
    t[1] = t[1]/2

    // update a
    vec.add(a.previous,t,a.previous);
    vec.add(a.current,t,a.current);
    poly.translate(a.shape, t[0] ,t[1]);
    poly.aabb(a.shape,a.aabb);

    // update b
    vec.sub(b.previous,t,b.previous);
    vec.sub(b.current,t,b.current);
    poly.translate(b.shape, -t[0] ,-t[1]);
    poly.aabb(b.shape,b.aabb);

  // otherwise only move a
  } else {
    vec.add(a.previous,t,a.previous);
    vec.add(a.current,t,a.current);
    poly.translate(a.shape, t[0] ,t[1]);
    poly.aabb(a.shape,a.aabb);
  }
}

function bounceDirect(world,a,b,c){
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
}

function bounceSteer(world,a,b,c){
  // console.log("BOUNCE STEER!")
  // divide the diff w. width to get the x normal
  var I = vec.norm(a.velocity)
    , n = vec.perp(c.nearestEdge)
    , r = vec.reflect(I,vec.norm(n,n))
    , l = vec.len(a.velocity)
    , d = (a.current[0] - b.current[0])/(a.aabb[1]-b.aabb[3]);

  // as nearestEdge is a bit shaky in it's
  // reliability we have the option of using
  // one that find an edge that crosses the
  // line between the centroids of the two
  // polygons.
  if( settings.data.improvedNormals ){
    improveNormals(a,b,I,r)
  }

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
}

function bounceReflect(world,a,b,c){
  // console.log("BOUNCE REFLECT!",a.id,a.index)
  var I = vec.norm(a.velocity)
    , n = vec.perp(c.nearestEdge)
    , r = vec.reflect(I,vec.norm(n,n))
    , l = vec.len(a.velocity)

  // as nearestEdge is a bit shaky in it's
  // reliability we have the option of using
  // one that find an edge that crosses the
  // line between the centroids of the two
  // polygons.
  if( settings.data.improvedNormals ){
    improveNormals(a,b,I,r)
  }

  // make sure it has the original velocity
  vec.smul(r,l,r)

  // console.log('before reflect')
  // console.log(' c:',a.current)
  // console.log(' p:',a.previous)
  // console.log(' v:',a.velocity)

  // update puck positions
  vec.sub(a.current,r,a.previous)

  // update velocity (which is used to check for other collisions)
  vec.copy(r,a.velocity)

  // console.log('after reflect')
  // console.log(' c:',a.current)
  // console.log(' p:',a.previous)
  // console.log(' v:',a.velocity)

  vec.free(r)
  vec.free(I)
  vec.free(n)
}


function improveNormals(a,b,I,r){
  var x = vec.make(); // output normal
  var o = vec.copy(a.current) // origin
  var t = vec.copy(b.current) // target
  var s = vec.sub(t,o) // ray

  // extend `s` backwards by `a.radius` to
  // avoid a possible issue where the lines won't
  // intersect.
  var ext = vec.norm(s)
  vec.smul(ext,a.radius,ext)
  vec.sub(o,ext,o)

  // update s
  vec.sub(t,o,s)

  if( findEdgeNormal(b.shape,o,s,x) ){
    vec.reflect(I,x,r)
  }
  vec.free(t)
  vec.free(o)
  vec.free(s)
  vec.free(x)
}

/**
 * Sends a ray (the vector) into the Polygon
 * to see which edge segment it intersects.
 *
 * Based on: http://afloatingpoint.blogspot.se/2011/04/2d-polygon-raycasting.html
 *
 * @param  {Polygon} p The polygon
 * @param  {Vector} o The ray origin
 * @param  {Vector} v The ray direction
 * @param  {Vector} n The edge normal (if found)
 * @return {Boolean} true if normal was found
 */
function findEdgeNormal(p,o,v,n){
  var e = vec.add(o,v)
  var f = vec.make()
  for(var i=0; i<p.length; i++){
    var a = p.vertices[i];
    var b = vec.add(a,p.edges[i],f)
    if( intersectsLineLine(o,e,a,b) ){
      vec.perp(p.edges[i],n)
      vec.norm(n,n)
      vec.free(f)
      vec.free(e)
      return true;
    }
  }
  vec.free(e)
  vec.free(f)
  return false;
}

function intersectsLineLine(a1,a2,b1,b2,i){
  var uaT = (b2[0] - b1[0]) * (a1[1]-b1[1]) - (b2[1]-b1[1]) * (a1[0]-b1[0]);
  var ubT = (a2[0] - a1[0]) * (a1[1]-b1[1]) - (a2[1]-a1[1]) * (a1[0]-b1[0]);
  var u   = (b2[1] - b1[1]) * (a2[0]-a1[0]) - (b2[0]-b1[0]) * (a2[1]-a1[1]);
  if( u !== 0 ){
    var ua = uaT / u;
    var ub = ubT / u;

    if( 0 <= ua && ua <= 1 && 0 <= ub && ub <= 1 ){
      // intersection point:
      if( i ){
        i[0] = a1[0]+ua*(a2[0]-a1[0])
        i[1] = a1[1]+ua*(a2[1]-a1[1])
      }
      return true;
    } else {
      // no intersection
      return false;
    }

  } else if( uaT === 0 || ubT === 0 ){
    // coincident
    return false;
  } else {
    // parallel
    return false;
  }
}