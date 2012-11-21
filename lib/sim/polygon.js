var Point = require('./point')

module.exports = Polygon;

function Polygon(vertices){
  this.vertices = [];
  this.edges = [];

  if( vertices ){
    for( var i=0; i < vertices.length; i += 2)
      this.add(new Point(vertices[i],vertices[i+1]));
    this.close()
  }
}

Polygon.prototype = {

  // source: http://alienryderflex.com/polygon/
  within: function(pt){
    var oddNodes = false
      , x = pt.x
      , y = pt.y;
    for( var i=0,j=this.vertices.length-1; i < this.vertices.length; i++ ){
      var vI = this.vertices[i]
        , vJ = this.vertices[j];
      if( (vI.y< y && vJ.y>=y
       ||  vJ.y<y && vI.y>=y)
       && (vI.x<=x || vJ.x<=x))
        oddNodes ^= (vI.x+(y-vI.y)/(vJ.y-vI.y)*(vJ.x-vI.x)<x);
      j = i;
    }
    return oddNodes;
  },

  restrain: function(pt){
    // TODO?
  },

  add: function(pt){
    if( this._prev )
      this.edges.push(new Edge(this._prev,pt));

    this.vertices.push(pt)
    this._prev = pt;
    return this;
  },

  close: function(){
    var first = this.vertices[0];
    if( this._prev.x !== first.x || this._prev.y !== first.y )
      this.edges.push(new Edge(this._prev,first));
    return this;
  },

  // flips the normals
  reverse: function(){
    for( var i=0; i < this.edges.length; i++ )
      this.edges[i].reverse();
    return this;
  },

  area: function(){
    var n = this.vertices.length;
    return .5 * this.vertices.reduce(function(sum,p,i,V){
      var q = V[(i+1)%n];
      return sum + p.x * q.y - q.x * p.y;
    },0)
  },

  centroid: function(c){
    // setting the centroid
    if( c ){
      // move all vertices relatively to the new centroid-old centroid
      var C = this.centroid()
        , x = c.x - C.x
        , y = c.y - C.y;

      for( var i=0; i < this.vertices.length; i++ )
        this.vertices[i].add(x,y);

      // TODO is this necessary? or will this be
      // calculated correctly?
      this._centroid = c;

    // getting the set centroid
    } else if( this._centroid ){
      return this._centroid;

    // generating the centroid
    // based off of the vertices
    } else {

      var a = this.area()
        , n = this.vertices.length
        , P = this.vertices;

      if( n == 1 )
        return new Point().copy(P[0]);

      if( n == 2 )
        return new Point(P[0].x + P[1].x / 2, P[0].y + P[1] / 2);

      var c = new Point();
      for(var i=0; i < n; i++){
        var p = P[i]
          , q = P[(i+1)%n]
          , ai = p.x * q.y - q.x * p.y;
        c.x += (p.x + q.x) * ai
        c.y += (p.y + q.y) * ai
      }
      return c.mul(1 / (6 * a));
    }
  },

  translate: function(x,y){
    for(var i=0; i < this.vertices.length; i++)
      this.vertices[i].add(x,y);
    return this;
  },

  rotate: function(theta,origin){
    origin = origin || this.centroid()
    var cos = Math.cos(theta)
      , sin = Math.sin(theta);
    for(var i=0; i < this.vertices.length; i++){
      var v = this.vertices[i]
        , tx = v.x - origin.x
        , ty = v.y - origin.y
      v.x = origin.x + (tx * cos - ty * sin)
      v.y = origin.y + (tx * sin + ty * cos)
    }
    return this;
  }

}

function Edge(a,b){
  this.a = a;
  this.b = b;
  this.normal = new Point()
  normal(this.a,this.b,this.normal)
}

Edge.prototype.reverse = function(){
  var a = this.a;
  this.a = this.b;
  this.b = a;
  normal(this.a,this.b,this.normal)
}

function normal(a,b,norm,ccw){
  // add normal vector for the crossed line
  var dx = b.x - a.x
    , dy = b.y - a.y;
  // dy, -dx (for ccw)
  return ccw
    ? norm.set(dy,-dx).normalize()
    : norm.set(-dy,dx).normalize();
}


// rotates a single point around origin
// src: http://stackoverflow.com/questions/3451061/how-to-do-correct-polygon-rotation-in-c-sharp-though-it-applies-to-anything#3451242
function rotate(origin, theta, pt){
  var tr = Point.sub(pt,origin)
  return new Point(
    origin.x + (tr.x * Math.cos(theta) - tr.y * Math.sin(theta)),
    origin.y + (tr.x * Math.sin(theta) + tr.y * Math.cos(theta))
  )
}