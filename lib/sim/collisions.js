var Point = require('./point');

exports.pointMassToRect = function(pointMass, rect){
  if( !rect.within(pointMass.current) ){
    // Find intersection
    var intersections = intersectsRectLine(rect, pointMass.previous, pointMass.current, pointMass.radius);

    // Make sure it's one
    if( !intersections )
      return;

    var intersection = intersections[0]

    // And only one
    if( intersections.length > 1 ){

      // it probably hit a corner and should most definitely
      // reflect off of both (at the same time).
      // TODO this 'act on the closest'-logic is then wrong
      //      and should be changed to 'reflect on both x and y'-logic
      // maybe even a 'reflect and restrain'-logic would work as
      // that would avoid the issue of the reflection pushing it
      // out of bounds.

      // var minDist = Infinity
      //   , pt = pointMass.previous;
      // for (var i = 0; i < intersections.length; i++) {
      //   var intr = intersections[i];
      //   var dx = intr.x - pt.x
      //     , dy = intr.y - pt.y
      //     , dist = dx*dx + dy*dy;
      //   if( dist < minDist ){
      //     intersection = intr;
      //     minDist = dist;
      //   }
      // }

      console.log('RECT got multiple intersections, reflected and restrained',intersections,intersection.toString(),pointMass.toString())

      reflect(pointMass, intersection)
      pointMass.onbounds(intersection)
      return rect.restrain(pointMass.current)
    } else {
      console.log('RECT got single intersection',intersection.toString(),pointMass.toString(),rect.toString())
    }

    reflect(pointMass, intersection)


    pointMass.onbounds(intersection)
  }
}

exports.pointMassToPoly = function(pointMass, poly){
  if( poly.within(pointMass.current) ){
    // Find intersection
    var intersections = intersectsPolyLine(poly, pointMass.previous, pointMass.current, pointMass.radius);

    // Make sure it's one
    if( !intersections )
      return;

    var intersection = intersections[0];

    // And only one
    if( intersections.length > 1 ){

      // it probably went through and through which causes multiple
      // intersections. Only react on the closest one.

      var minDist = Infinity
        , pt = pointMass.previous;
      for (var i = 0; i < intersections.length; i++) {
        var intr = intersections[i];
        var dx = intr.x - pt.x
          , dy = intr.y - pt.y
          , dist = dx*dx + dy*dy;
        if( dist < minDist ){
          intersection = intr;
          minDist = dist;
        }
      }
      console.error('POLY got multiple intersections, picked the closest',intersections,intersection.toString(),pointMass.toString())

    } else {
      console.log('POLY got single intersection',intersection.toString(),pointMass.toString())
    }

    reflect(pointMass, intersection);
    pointMass.oncollision(intersection,poly);
  }
}

function reflect(pointMass, intersection){
  // Reflect against surface normal (n)
  // v' = v - 2(v⋅n)n
  var ns = intersection.normal.toString()
  var n = intersection.normal
    , vd = pointMass.velocity.dot(n) * 2
    , v2 = pointMass.velocity.clone().sub(n.mul(vd)).normalize()
    , p2 = v2.clone().mul(-Point.distance(intersection,pointMass.previous))
    , c2 = v2.clone().mul(+Point.distance(intersection,pointMass.current))

  // if current == intersection we need a special case
  // because the new position of the pointMass will still
  // be on the intersection, thus it will be an intersection
  // and reflected back again.
  // (solved now by adding back the `rect.within()`-check but
  // keeping this comment in case i wonder wtf again)

  var d = Point.distance(pointMass.previous,pointMass.current)
  var p = pointMass.toString()
  pointMass.previous.set(p2).add(intersection)
  pointMass.current.set(c2).add(intersection)

  // console.log('reflected (distance: %s)',d)
  // console.log(' was: %s',p)
  // console.log(' now: %s',pointMass.toString())
  // console.log(' normal: %s',ns)
  // console.log(' vd: %s',vd)
  // console.log(' v2: %s',v2.toString())
  // console.log(' intersection: %s',intersection.toString())
}

// source: http://www.kevlindev.com/gui/math/intersection/Intersection.js
function intersectsRectLine(rect,a1,a2,r){
  // return intersectsPolyLine(rect,a1,a2,r)
  var pt
    , results = [];

  pt = intersectsLineLine(rect.topLeft,rect.topRight,a1,a2,r)
  if( pt ) results.push(pt);
  pt = intersectsLineLine(rect.topRight,rect.bottomRight,a1,a2,r)
  if( pt ) results.push(pt);
  pt = intersectsLineLine(rect.bottomRight,rect.bottomLeft,a1,a2,r)
  if( pt ) results.push(pt);
  pt = intersectsLineLine(rect.bottomLeft,rect.topLeft,a1,a2,r)
  if( pt ) results.push(pt);

  return results.length ? results : null;
}


function intersectsPolyLine(poly,a1,a2,r){
  var pt
    , results = []
    , edges = poly.edges;
  for( var i=0; i < edges.length; i++ )
    if( pt = intersectsLineLine(edges[i].a,edges[i].b,a1,a2,r) )
      results.push(pt);
  return results.length ? results : null;
}


function intersectsLineLine(a1,a2,b1,b2,r){
  var ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
  var ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
  var u_b  = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);

  if( r ){

    // console.log('ua_t',ua_t)
    // console.log('ub_t',ub_t)
    // console.log('u_b',u_b)
    // console.log('r',r)
    // console.log('')

  }

  if ( u_b != 0 ) {
    var ua = ua_t / u_b;
    var ub = ub_t / u_b;

    // intersects!
    if ( 0 <= ua && ua <= 1 && 0 <= ub && ub <= 1 ) {
      var pt = new Point(
        a1.x + ua * (a2.x - a1.x),
        a1.y + ua * (a2.y - a1.y)
      )
      // add normal vector for the crossed line
      var dx = a2.x - a1.x
        , dy = a2.y - a1.y;
      // or dy, -dx (for ccw)
      pt.normal = new Point(-dy,dx).normalize();
      return pt;
    }

    // no intersection!
    return null;
  } else {
    // Coincident (on top of each other)
    if ( ua_t == 0 || ub_t == 0 ) {
      return null;
    // Parallel
    } else {
      return null;
    }
  }
}