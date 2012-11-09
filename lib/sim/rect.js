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
  }

}
