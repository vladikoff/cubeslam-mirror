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