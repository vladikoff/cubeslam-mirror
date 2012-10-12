var Point = require('./point');


module.exports = Rect;

function Rect(t,r,b,l){
  this.t = t;
  this.r = r;
  this.b = b;
  this.l = l;
}

Rect.prototype = {

  within: function(pt){
    return pt.x > this.l && pt.x < this.r
        && pt.y > this.t && pt.y < this.b;
  },

  restrain: function(pt){
    if( pt.y < this.t )
      pt.y = 2 * this.t - pt.y;
    if( pt.y > this.b )
      pt.y = 2 * this.b - pt.y;
    if( pt.x < this.l )
      pt.x = 2 * this.l - pt.x;
    if( pt.x > this.r )
      pt.x = 2 * this.r - pt.x;
  },

  // source: http://www.kevlindev.com/gui/math/intersection/Intersection.js
  intersectsWithLine: function(a1,a2){
    var topLeft = new Point(this.l,this.t)
      , topRight = new Point(this.r,this.t)
      , bottomLeft = new Point(this.l,this.b)
      , bottomRight = new Point(this.r,this.b)
      , pt
      , results = [];

    pt = intersectsLineLine(topLeft,topRight,a1,a2)
    if( pt ) results.push(pt);
    pt = intersectsLineLine(topRight,bottomRight,a1,a2)
    if( pt ) results.push(pt);
    pt = intersectsLineLine(bottomRight,bottomLeft,a1,a2)
    if( pt ) results.push(pt);
    pt = intersectsLineLine(bottomLeft,topLeft,a1,a2)
    if( pt ) results.push(pt);

    return results.length ? results : null;
  }

}


function intersectsLineLine(a1,a2,b1,b2){
  var result;

  var ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
  var ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
  var u_b  = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);

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