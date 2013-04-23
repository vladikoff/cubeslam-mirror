var geom = require('geom')
  , vec = geom.vec;

module.exports = Force;

/**
 * A Force is a point which pulls or pushes on the Bodies
 */
function Force(type,x,y,mass,power){
  if( !type ) throw new Error('missing type')
  this.type = type; // repell || attract
  this.power = power || 1; // 0-1
  this.mass = mass || 100;
  this.radius = this.mass/2;
  this.position = vec.make(x,y)
  this.active = false;
}

Force.prototype = {
  toString: function(){
    return 'Force('+[
      this.type,
      'active:'+this.active,
      'mass:'+this.mass,
      'x:'+this.position[0],
      'y:'+this.position[1]
    ]+')'
  }
}