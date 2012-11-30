var geom = require('geom')
  , vec = geom.vec;

module.exports = Force;

/**
 * A Force is a point which pulls or pushes on the PointMasses
 */
function Force(type,pt,mass,power){
  if( !type ) throw new Error('missing type')
  this.type = type;
  this.power = power || 8;
  this.mass = mass || 1;
  this.position = vec.copy(pt)
  console.log('created force',this.toString())
}

Force.prototype = {

  applyForce: function(body){
    switch( this.type ){

      case 'attract':
        var diff = vec.sub(this.position, body.current)
          , dist = vec.len(diff);
        if( dist * 2 < this.mass ){
          var f = Math.pow(1-dist/this.mass,this.power) * -this.mass;
          body.applyForce(diff[0]*f, diff[1]*f);
        }
        vec.free(diff)
        break;

      case 'repell':
        var diff = vec.sub(this.position, body.current)
          , dist = vec.len(diff);
        if( dist * 2 < this.mass ){
          var f = Math.pow(1-dist/this.mass,this.power) * this.mass;
          body.applyForce(diff[0]*f, diff[1]*f);
        }
        vec.free(diff)
        break;

      default:
        throw new Error('invalid force')
    }
  },

  toString: function(){
    return 'Force('+[
      this.type,
      'mass:'+this.mass,
      'x:'+this.position[0],
      'y:'+this.position[1]
    ]+')'
  }

}