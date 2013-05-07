var debug = require('debug')('actions:obstacle')
  , settings = require('../settings')
  , BodyFlags = require('../sim/body-flags')
  , shapes = require('../sim/shapes')
  , colliding = require('../support/aabb').colliding
  , actions = require('./')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , dmaf = require('../dmaf.min');

exports.createNextObstacle = function(world){
  debug('%s create next',world.name);

  // first test that the shape (aabb) of the body
  // will not collide
  var obstacle = world.level.obstacles[world.obstacles.length];

  if( !obstacle ){
    return null;
  }

  var shape = getObstacleShape(obstacle);
  poly.translate(shape,obstacle.x,obstacle.y,shape);
  var fake = { aabb: poly.aabb(shape), id: 'obstacle' };
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

  if( shape ){
    body = world.createBody(shape,x,y,flags)
    body.id = 'obstacle';
    body.data.id = id;
    world.obstacles.set(body.index,body)
    actions.emit('added','obstacle',world,body);
  }
  return body;
}

exports.destroyObstacle = function(world,obstacle){
  debug('%s destroy',world.name ,obstacle.index);

  world.obstacles.del(obstacle.index)
  world.releaseBody(obstacle)
  actions.emit('removed','obstacle',world,obstacle);

}

exports.hitPuckObstacle = function(world,puck,obstacle){

  if( obstacle.data.regenerate ) {
    actions.emit('hide','obstacle',world,obstacle);
    actions.hideObstacle(world,obstacle)
  }
  else {
    if(BodyFlags.has(obstacle,BodyFlags.DESTROY)){
      actions.destroyObstacle(world,obstacle)
    }
  }

  dmaf.tell('obstacle_hit');

  actions.puckBounced(world,puck)
}

function getObstacleShape(obstacle){
  var size = obstacle.size;
  switch(obstacle.id || obstacle){
    case 'triangle-left':
      return shapes.triangle(settings.data.unitSize*(size && size[0]||3),settings.data.unitSize*(size && size[1]||4),true)
    case 'triangle-right':
      return shapes.triangle(settings.data.unitSize*(size && size[0]||3),settings.data.unitSize*(size && size[1]||4),false)
    case 'triangle-top':
      return shapes.triangle(settings.data.unitSize*(size && size[0]||3),settings.data.unitSize*(size && size[1]||4),false,true)
    case 'triangle-bottom':
      return shapes.triangle(settings.data.unitSize*(size && size[0]||3),settings.data.unitSize*(size && size[1]||4),true,true)
    case 'diamond':
      return shapes.diamond(settings.data.unitSize*(size||4))
    case 'hexagon':
      return shapes.hex(settings.data.unitSize*(size||3))
    case 'octagon':
      return shapes.oct(settings.data.unitSize*(size||8))
    case 'block-breakout':
      return shapes.rect(settings.data.unitSize,settings.data.unitSize);
    case 'block-rect':
      return shapes.rect(settings.data.unitSize*(size && size[0]||1),settings.data.unitSize*(size && size[1]||1));
    default:
      throw new Error('unsupported obstacle: '+obstacle.id)
  }
}
