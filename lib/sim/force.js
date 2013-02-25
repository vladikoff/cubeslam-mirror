var geom = require('geom')
  , vec = geom.vec;

module.exports = Force;

/**
 * A Force is a point which pulls or pushes on the Bodies
 */
function Force(type,x,y,mass,power){
  if( !type ) throw new Error('missing type')
  this.type = type; // repell || attract
  this.power = power || 8;
  this.mass = mass || 1;
  this.position = vec.make(x,y)
}

Force.prototype = {
  toString: function(){
    return 'Force('+[
      this.type,
      'mass:'+this.mass,
      'x:'+this.position[0],
      'y:'+this.position[1]
    ]+')'
  }
}