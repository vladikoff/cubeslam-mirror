var debug = require('debug')('actions:obstacle')
  , settings = require('../settings')
  , BodyFlags = require('../geom-sim/body-flags')
  , shapes = require('../geom-sim/shapes')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

exports.createObstacle = function(world,id,x,y){
  debug('obstacle create',id,x,y);

  switch(id){
    case 'hexagon':
      var shape = shapes.hex(settings.data.arenaWidth/5)
      var body = world.createBody(shape,x,y,BodyFlags.STATIC | BodyFlags.BOUNCE)
      break;

    case 'block-breakout':
      var shape = shapes.rect(settings.data.unitSize,settings.data.unitSize);
      var body = world.createBody(shape,x,y,BodyFlags.STATIC | BodyFlags.BOUNCE | BodyFlags.DESTROY | BodyFlags.REFLECT)
      break;

    case 'block-big':
      var shape = shapes.rect(settings.data.unitSize*6,settings.data.unitSize*6);
      var body = world.createBody(shape,x,y,BodyFlags.STATIC | BodyFlags.BOUNCE)
      break;

    case 'block-rect':
      var shape = shapes.rect(settings.data.unitSize*6,settings.data.unitSize*6);
      var body = world.createBody(shape,x,y,BodyFlags.STATIC | BodyFlags.BOUNCE)
      break;

    default:
      throw new Error('unsupported obstacle: '+id)

  }
  world.obstacles.set(body.index,body)
  return body;
}

exports.destroyObstacle = function(world,obstacle){
  debug('destroy',obstacle.index);
  world.obstacles.del(obstacle.index)
  world.releaseBody(obstacle)
}
