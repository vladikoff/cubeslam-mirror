var debug = require('debug')('actions:paddle')
  , settings = require('../settings')
  , BodyFlags = require('../geom-sim/body-flags')
  , shapes = require('../geom-sim/shapes')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;


exports.createPaddle = function(world,x,y){
  debug('create',x,y,w,h)
  var aw = settings.data.arenaWidth
    , ah = settings.data.arenaHeight
    , w = settings.data.unitSize*4
    , h = settings.data.unitSize*2;
  var paddle = world.createBody(shapes.rect(w,h),x*aw,y*ah,BodyFlags.DYNAMIC | BodyFlags.BOUNCE | BodyFlags.STEER)
  paddle.id = 'paddle' // for debugging mostly
  paddle.damping = settings.data.paddleDamping;
  paddle.mass = settings.data.paddleMass;
  world.paddles.set(paddle.index,paddle)
  return paddle.index;
}

exports.resizePaddle = function(world,paddle,size){
  // TODO size should be a multiplier (ex. .5 = 50%, 1.5 = 150%, 1 = 100%)
}

exports.movePaddle = function(world,dx){
  var p = world.paddles.get(world.me.paddle);
  p.current[0] += dx;
}