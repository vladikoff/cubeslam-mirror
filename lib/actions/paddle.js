var debug = require('debug')('actions:paddle')
  , settings = require('../settings')
  , Body = require('../geom-sim/body')
  , shapes = require('../geom-sim/shapes')
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


exports.createPaddle = function(world,id,x,y,w,h){
  debug('create [%s]',id,x,y,w,h)
  var aw = settings.data.arenaWidth
    , ah = settings.data.arenaHeight
    , w = settings.data.unitSize*4
    , h = settings.data.unitSize*2;
  var paddle = new Body(shapes.rect(w,h),x*aw,y*ah,Body.DYNAMIC | Body.BOUNCE | Body.STEER)
  paddle.id = id;
  paddle.damping = settings.data.paddleDamping;
  paddle.mass = settings.data.paddleMass;
  paddle.onbounds = function(b){
    // offset b to avoid intersection
    vec.add(paddle.current, b, paddle.current)

    // reset velocity by settings previous to current
    vec.copy(paddle.current, paddle.previous)
  }
  world.bodies.set(id,paddle);
  world.paddles.set(id,paddle);
  return id;
}

