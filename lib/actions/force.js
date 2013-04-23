var debug = require('debug')('actions:force')
  , settings = require('../settings')
  , actions = require('./')
  , dmaf = require('../dmaf.min')
  , Force = require('../sim/force');

exports.createNextForce = function(world){
  debug('%s create next', world.name);

  var force = world.level.forces[world.forces.length];
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
        force.interval = world.tick.setInterval('toggleForce',settings.data.forcesInterval,force.index);
      } else {
        force.active = true;
      }
      world.forces.set(force.index,force);
      actions.emit('added','force',world,force);
      break;
    default:
      throw new Error('invalid force kind');
  }
}


exports.toggleForce = function(world,forceIndex){
  var force = world.forces.get(forceIndex);
  force.active = !force.active;
  dmaf.tell('force_' + (force.active ? 'show' : 'hide') );

  // run checkPuckSpeed on all pucks to keep
  // them in check
  if( !force.active ){
    actions.puckCheckSpeedAll(world);
  }
}

exports.destroyForce = function(world,force){
  debug('%s destroy',force)
  world.forces.del(force.index);
  world.tick.clearInterval(force.interval);
  actions.emit('removed','force',world,force);
}