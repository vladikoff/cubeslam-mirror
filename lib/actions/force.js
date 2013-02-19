var debug = require('debug')('actions:force')
  , Force = require('../sim/force');

exports.forceCreate = function(world,kind, x, y, mass){
  debug('%s create',world.name ,kind, x, y, mass)

  if( !mass )
    throw new Error('cannot create a force without a mass')

  // TODO
  switch(kind){
    case 'repell': break;
    case 'attract': break;
    default:
      throw new Error('invalid force kind');
  }
}


exports.forceDestroy = function(world,kind, x, y){
  debug('%s destroy',world.name ,kind, x, y)
  // TODO
}