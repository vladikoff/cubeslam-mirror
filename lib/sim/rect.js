var Point = require('./point')
  , Polygon = require('./polygon');


module.exports = Rect;

function Rect(t,r,b,l){
  this.t = t;
  this.r = r;
  this.b = b;
  this.l = l;

  this.width = r - l;
  this.height = b - t;

  // Make Rect a Polygon
  var vertices = [l,t,r,t,r,b,l,b];
  Polygon.call(this,vertices)
  this.topLeft = this.vertices[0]
  this.topRight = this.vertices[1]
  this.bottomRight = this.vertices[2]
  this.bottomLeft = this.vertices[3]
}

Rect.prototype = {

  __proto__: Polygon.prototype,

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

  update: function(){
    this.topLeft.set(this.l,this.t)
    this.topRight.set(this.r,this.t)
    this.bottomLeft.set(this.l,this.b)
    this.bottomRight.set(this.r,this.b)
    this.width = this.r - this.l;
    this.height = this.b - this.t;
  }

}
