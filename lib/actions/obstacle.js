var debug = require('debug')('actions:obstacle')
  , settings = require('../settings')
  , BodyFlags = require('../geom-sim/body-flags')
  , shapes = require('../geom-sim/shapes')
  , colliding = require('../collisions').colliding
  , actions = require('./')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

exports.createNextObstacle = function(world,level){
  debug('create next');

  // first test that the shape (aabb) of the body
  // will not collide
  var obstacle = level.obstacles[world.obstacles.length];
  var shape = getObstacleShape(obstacle.id);
  poly.translate(shape,obstacle.x,obstacle.y,shape);
  var fake = { aabb: poly.aabb(shape) };
  if( colliding(world,fake) ){
    return console.log('colliding obstacle. trying again next frame.',fake)
  }

  // now we can create the obstacle
  return actions.createObstacle(world,obstacle.id,obstacle.x,obstacle.y);
}

exports.createObstacle = function(world,id,x,y){
  debug('create',id,x,y);

  var shape = getObstacleShape(id)
    , body;
  switch(id){
    case 'hexagon':
      body = world.createBody(shape,x,y,BodyFlags.STATIC | BodyFlags.BOUNCE)
      break;
    case 'block-breakout':
      body = world.createBody(shape,x,y,BodyFlags.STATIC | BodyFlags.BOUNCE | BodyFlags.DESTROY | BodyFlags.REFLECT)
      break;
    case 'block-big':
      body = world.createBody(shape,x,y,BodyFlags.STATIC | BodyFlags.BOUNCE)
      break;
    case 'block-rect':
      body = world.createBody(shape,x,y,BodyFlags.STATIC | BodyFlags.BOUNCE)
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



function getObstacleShape(id){
  switch(id){
    case 'hexagon':
      return shapes.hex(settings.data.arenaWidth/5)
    case 'block-breakout':
      return shapes.rect(settings.data.unitSize,settings.data.unitSize);
    case 'block-big':
      return shapes.rect(settings.data.unitSize*6,settings.data.unitSize*6);
    case 'block-rect':
      return shapes.rect(settings.data.unitSize*6,settings.data.unitSize*6);
    default:
      throw new Error('unsupported obstacle: '+id)
  }
}