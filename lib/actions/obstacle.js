var debug = require('debug')('actions:obstacle')
  , settings = require('../settings')
  , BodyFlags = require('../sim/body-flags')
  , shapes = require('../sim/shapes')
  , colliding = require('../sim/collisions').colliding
  , actions = require('./')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

exports.createNextObstacle = function(world,level){
  debug('%s create next',world.name);

  // first test that the shape (aabb) of the body
  // will not collide
  var obstacle = level.obstacles[world.obstacles.length];

  if( !obstacle ){
    return null;
  }

  var shape = getObstacleShape(obstacle);
  poly.translate(shape,obstacle.x,obstacle.y,shape);
  var fake = { aabb: poly.aabb(shape) };

  if( colliding(world,fake) ){
    return debug('colliding obstacle. trying again next frame.',fake)
  }

  var flags = BodyFlags.STATIC | BodyFlags.BOUNCE;
  if( obstacle.destroyable ){
    flags |= BodyFlags.DESTROY;
  }

  // now we can create the obstacle
  return actions.createObstacle(world,obstacle.id,obstacle.x,obstacle.y,flags,shape);
}

exports.createObstacle = function(world,id,x,y,flags,shape){
  debug('%s create',world.name ,id,x,y);

  var body
    , shape = shape || getObstacleShape(id)
    , flags = flags || BodyFlags.STATIC | BodyFlags.BOUNCE;

  switch(id){
    case 'triangle-left':
    case 'triangle-right':
    case 'diamond':
    case 'hexagon':
    case 'block-breakout':
    case 'block-rect':
      body = world.createBody(shape,x,y,flags)
      body.id = 'obstacle';
      break;
    default:
      throw new Error('unsupported obstacle: '+id)
  }

  world.obstacles.set(body.index,body)
  actions.emit('added','obstacle',world,body);
  return body;
}

exports.destroyObstacle = function(world,obstacle){
  debug('%s destroy',world.name ,obstacle.index);
  world.obstacles.del(obstacle.index)
  world.releaseBody(obstacle)
  actions.emit('removed','obstacle',world,obstacle);
}

exports.hitObstacle = function(world,obstacle,puck){
  dmaf.tell('obstacle_hit');
}

function getObstacleShape(obstacle){
  switch(obstacle.id || obstacle){
    case 'triangle-left':
      return shapes.triangle(settings.data.unitSize*3,settings.data.unitSize*4,true)
    case 'triangle-right':
      return shapes.triangle(settings.data.unitSize*3,settings.data.unitSize*4,false)
    case 'diamond':
      return shapes.diamond(settings.data.unitSize*4)
    case 'hexagon':
      return shapes.hex(settings.data.unitSize*8)
    case 'block-breakout':
      return shapes.rect(settings.data.unitSize,settings.data.unitSize);
    case 'block-rect':
      return shapes.rect(settings.data.unitSize*(obstacle.size[0]||1),settings.data.unitSize*(obstacle.size[1]||1));
    default:
      throw new Error('unsupported obstacle: '+obstacle.id)
  }
}
