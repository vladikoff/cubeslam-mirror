var Point = require('./point');

exports.pointMassToRect = function(pointMass, rect){
  if( !rect.within(pointMass.current) ){
    // Find intersection
    var intersections = intersectsRectLine(rect, pointMass.previous, pointMass.current, pointMass.radius);

    // Make sure it's one
    if( !intersections )
      return;

    // And only one
    if( intersections.length > 1 ){
      console.warn('woops, multiple intersections. FIXME!',intersections);
      return rect.restrain(pointMass.current)
    }

    var intersection = intersections[0]
    reflect(pointMass, intersection)
    pointMass.onbounds(intersection)
  }
}

exports.pointMassToPoly = function(pointMass, poly){
  // if( poly.within(pointMass.current) ){
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
    }

    reflect(pointMass, intersection);
    pointMass.oncollision(intersection,poly);
  // }
}

function reflect(pointMass, intersection){
  // Reflect against surface normal (n)
  // v' = v - 2(v⋅n)n
  var n = intersection.normal
    , vd = pointMass.velocity.dot(n) * 2
    , v2 = pointMass.velocity.clone().sub(n.mul(vd)).normalize()
    , p2 = v2.clone().mul(-Point.distance(intersection,pointMass.previous))
    , c2 = v2.clone().mul(+Point.distance(intersection,pointMass.current))

  pointMass.previous.set(p2).add(intersection)
  pointMass.current.set(c2).add(intersection)
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

    console.log('ua_t',ua_t)
    console.log('ub_t',ub_t)
    console.log('u_b',u_b)
    console.log('r',r)
    console.log('')

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