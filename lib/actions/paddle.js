var debug = require('debug')('actions:paddle')
  , settings = require('../settings')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

exports.paddlePush = function(world, id, x, y){
  debug('push [%s] %s,%s',id, x, y)
  var p = world.paddles.get(id);
  if( !p )
    throw new Error('cannot push paddle, does not exist yet');
  else
    p.applyForce(+x,+y);
}

