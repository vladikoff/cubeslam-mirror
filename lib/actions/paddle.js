var debug = require('debug')('actions:paddle')
  , settings = require('../settings')
  , BodyFlags = require('../geom-sim/body-flags')
  , shapes = require('../geom-sim/shapes')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;


exports.createPaddle = function(world,player){
  debug('create',player)
  var aw = settings.data.arenaWidth
    , ah = settings.data.arenaHeight
    , u = settings.data.unitSize
    , w = u*4
    , h = u*2
    , x = aw/2
    , y = (player === world.players.a ? u*1.5 : ah-u*1.5);
  var paddle = world.createBody(shapes.rect(w,h),x,y,BodyFlags.DYNAMIC | BodyFlags.BOUNCE | BodyFlags.STEER)
  paddle.id = 'paddle' // for debugging mostly
  paddle.damping = settings.data.paddleDamping;
  paddle.mass = settings.data.paddleMass;
  world.paddles.set(paddle.index,paddle)
  return paddle.index;
}

exports.resizePaddle = function(world,paddle,size){
  // TODO size should be a multiplier (ex. .5 = 50%, 1.5 = 150%, 1 = 100%)
}

exports.movePaddle = function(world,paddle,dx){
  var p = world.paddles.get(paddle);
  p.current[0] += dx;
}