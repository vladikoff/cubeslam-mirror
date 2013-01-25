var debug = require('debug')('actions:obstacle')
  , settings = require('../settings')
  , Body = require('../geom-sim/body')
  , shapes = require('../geom-sim/shapes')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

exports.obstacleCreate = function(world,id,x,y){
  debug('obstacle create',id,x,y);

  switch(id){
    case 'hexagon':
      var shape = shapes.hex(settings.data.arenaWidth/5)
      var body = world.createBody(shape,x,y,Body.STATIC | Body.BOUNCE)
      break;

    case 'block-breakout':
      var shape = shapes.rect(settings.data.unitSize,settings.data.unitSize);
      var body = world.createBody(shape,x,y,Body.STATIC | Body.BOUNCE | Body.DESTROY | Body.REFLECT)
      break;

    case 'block-big':
      var shape = shapes.rect(settings.data.unitSize*6,settings.data.unitSize*6);
      var body = world.createBody(shape,x,y,Body.STATIC | Body.BOUNCE)
      break;

    case 'block-rect':
      var shape = shapes.rect(settings.data.unitSize*6,settings.data.unitSize*6);
      var body = world.createBody(shape,x,y,Body.STATIC | Body.BOUNCE)
      break;

    case 'shield':
      var shape = shapes.rect(settings.data.unitSize*6,settings.data.unitSize/6);
      var body = world.createBody(shape,x,y,Body.STATIC | Body.BOUNCE | Body.DESTROY)
      break;

    default:
      throw new Error('unsupported obstacle: '+id)

  }
  world.obstacles.set(body.index,body)
  return body.index;
}

exports.obstacleDestroy = function(world,obstacle){
  debug('destroy',obstacle.index);
  world.obstacles.del(obstacle)
  world.releaseBody(obstacle)
}
