var Point = require('./point');


module.exports = Force;

/**
 * A Force is a point which pulls or pushes on the PointMasses
 */
function Force(type,pt,mass){
  if( !type ) throw new Error('missing type')
  this.type = type;
  this.mass = mass || 1;
  Point.call(this,pt);
}

Force.prototype = {
  __proto__: Point.prototype,

  applyForce: function(pointMass){
    if( this.type == 'repell' ){
      var diff = Point.diff(this, pointMass.current)
        , dist = diff.length;
      if( dist * 2 < this.mass ){
        var f = this.mass / dist;
        pointMass.applyForce(
          f * diff.x,
          f * diff.y
        );
      }
    } else if( this.type == 'attract' ){
      var diff = Point.diff(this, pointMass.current)
        , dist = diff.length*2;
      if( dist < this.mass ){
        var f = (1 - dist/this.mass) * -(this.mass-pointMass.mass)/2;
        pointMass.applyForce(
          f * diff.x,
          f * diff.y
        );
      }
    }
  },

  toString: function(){
    return 'Force('+[
      this.type,
      'mass:'+this.mass,
      'x:'+this.x,
      'y:'+this.y
    ]+')'
  }

}