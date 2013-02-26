var debug = require('debug')('actions:force')
  , settings = require('../settings')
  , actions = require('./')
  , Force = require('../sim/force');

exports.createNextForce = function(world,level){
  debug('%s create next', world.name);

  var force = level.forces[world.forces.length];
  if( !force ){
    return null;
  }

  // now we can create the force
  return actions.createForce(world,force.type,force.x,force.y,force.mass || 10);
}

exports.createForce = function(world,type, x, y, mass){
  debug('%s create', world.name, type, x, y, mass)

  if( !mass )
    throw new Error('cannot create a force without a mass')

  switch(type){
    case 'repell':
    case 'attract':
      var force = new Force(type, x, y, mass, 1)
      force.index = world.index++;
      if( settings.data.forcesInterval > 0 ){
        force.interval = world.tick.setInterval(function(){
          force.active = !force.active;
        },settings.data.forcesInterval);
      }
      world.forces.set(force.index,force);
      actions.emit('added','force',world,force);
      break;
    default:
      throw new Error('invalid force kind');
  }
}


exports.destroyForce = function(world,force){
  debug('%s destroy',force)
  world.forces.del(force.index);
  world.tick.clearInterval(force.interval);
  actions.emit('removed','force',world,force);
}