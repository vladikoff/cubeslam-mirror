var Point = require('./point');

module.exports = Force;

/**
 * A Force is a point which pulls or pushes on the PointMasses
 */
function Force(type,pt,mass){
  if( !type ) throw new Error('missing type')
  this.type = type;
  this.power = 8;
  this.mass = mass || 1;
  Point.call(this,pt);
}

Force.prototype = {
  __proto__: Point.prototype,

  applyForce: function(pointMass){
    switch( this.type ){

      case 'attract':
        var diff = Point.diff(this, pointMass.current)
          , dist = diff.length;
        if( dist * 2 < this.mass ){
          var f = Math.pow(1-dist/this.mass,this.power) * -this.mass;
          pointMass.applyForce(diff.x*f, diff.y*f);
        }
        break;

      case 'repell':
        var diff = Point.diff(this, pointMass.current)
          , dist = diff.length;
        if( dist * 2 < this.mass ){
          var f = Math.pow(1-dist/this.mass,this.power) * this.mass;
          pointMass.applyForce(diff.x*f, diff.y*f);
        }
        break;

      default:
        throw new Error('invalid force')
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