var debug = require('debug')('actions:force')
  , Force = require('../geom-sim/force');

exports.forceCreate = function(world,kind, x, y, mass){
  debug('force create',kind, x, y, mass)
  if( !world.host )
    throw new Error('cannot create a force as guest')
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
  debug('force destroy',kind, x, y)
  if( !world.host && !mass )
    throw new Error('cannot create a force without a mass')

  // TODO
}