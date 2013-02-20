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
  debug('%s create',world.name ,id,x,y);

  var shape = getObstacleShape(id)
    , body;
  
  if( id.indexOf('block-rect')!=-1) {
    //Clean this up...
    body = ( id.indexOf("destroy")!=-1)? 
      world.createBody(shape,x,y,BodyFlags.STATIC | BodyFlags.BOUNCE  | BodyFlags.DESTROY) 
      : world.createBody(shape,x,y,BodyFlags.STATIC | BodyFlags.BOUNCE)
    
  }
  else {
    switch(id){
      case 'triangle-left':
      case 'triangle-right':
      case 'diamond':
      case 'hexagon':
        body = world.createBody(shape,x,y,BodyFlags.STATIC | BodyFlags.BOUNCE)
        break;
      case 'block-breakout':
        body = world.createBody(shape,x,y,BodyFlags.STATIC | BodyFlags.BOUNCE | BodyFlags.DESTROY | BodyFlags.REFLECT)
        break;
      default:

        throw new Error('unsupported obstacle: '+id)
    }
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



function getObstacleShape(id){

  //TODO refactor this, and use regexp instead of substring
  if( id.indexOf('block-rect') != -1 ) {
    var isolate = id.substring(id.indexOf('block-rect-') + 11,id.length);
    var x = isolate.substring(0, isolate.indexOf('x'));
    if( isolate.indexOf('-') != -1) isolate = isolate.substring(0,isolate.indexOf('-'));
    var y = isolate.substring(isolate.indexOf('x')+1, isolate.length );
    return shapes.rect(settings.data.unitSize*Number(x),settings.data.unitSize*Number(y));
  }

  switch(id){
    case 'triangle-left':
      return shapes.triangle(settings.data.unitSize*4,settings.data.unitSize*4,true)
    case 'triangle-right':
      return shapes.triangle(settings.data.unitSize*4,settings.data.unitSize*4,false)
    case 'diamond':
      return shapes.diamond(settings.data.unitSize*4)
    case 'hexagon':
      return shapes.hex(settings.data.unitSize*8)
    case 'block-breakout':
      return shapes.rect(settings.data.unitSize,settings.data.unitSize);
    default:
      throw new Error('unsupported obstacle: '+id)
  }
}