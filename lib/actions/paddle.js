var debug = require('debug')('actions:paddle')
  , settings = require('../settings')
  , BodyFlags = require('../sim/body-flags')
  , shapes = require('../sim/shapes')
  , actions = require('../actions')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , mat = geom.mat
  , dmaf = require('../dmaf.min');


exports.createPaddle = function(world,player){
  debug('%s create',world.name ,player)
  var aw = settings.data.arenaWidth
    , ah = settings.data.arenaHeight
    , u = settings.data.unitSize
    , w = u*4
    , h = u
    , x = aw/2
    , y = (player === world.players.b ? u : ah-u);
  var paddle = world.createBody(shapes.rect(w,h),x,y,BodyFlags.DYNAMIC | BodyFlags.BOUNCE | BodyFlags.STEER)
  paddle.id = 'paddle' // for debugging mostly
  paddle.damping = settings.data.paddleDamping;
  paddle.mass = settings.data.paddleMass;
  world.paddles.set(paddle.index,paddle);
  actions.emit('added paddle',world,paddle);
  return paddle.index;
}

exports.hitPaddle = function(world,puck,paddle){

  var player = paddle.index == world.players.a.paddle ? 'a' : 'b';

  // only add if puck hit other paddle in between
  if( world.lastHitPucks[puck.index] !== player ){
    world.puckBounces[puck.index]++;
  }

  // mark who hit it last
  world.lastHitPucks[puck.index] = player;

  // puck was already fireball
  if( puck.data.fireball === 1){
    // TODO make paddle "dizzy"

    paddle.data.dizzyTimes = 0;
    world.tick.clearInterval(paddle.data.dizzyInterval)
    paddle.data.dizzyInterval = world.tick.setInterval(function(paddle,world){
      dmaf.tell( "paddle_dizzy");
      paddle.data.dizzyDirection = paddle.data.dizzyDirection || 1;
      paddle.data.dizzyDirection *= -1;
      actions.movePaddle(world,paddle.index,paddle.data.dizzyDirection*100);

      paddle.data.dizzyTimes++

      if(paddle.data.dizzyTimes>15) {
        world.tick.clearInterval(paddle.data.dizzyInterval)
      }
    }.bind(null,paddle,world), 100)

    puck.data.fireball = 2; // turn off
  }

  // add some extra power to each hit
  // unit * (speed+speedup*bounces)
  // 20 * (1+0) > 20 * (1+.2) > 20 * (1+.4)
  // ex. 20 > 20 * 1.2 > 20 * 1.4 > ... > 20 * 4
  var level = world.level.puck.speed
    , speedup = world.level.puck.speedup
    , maxspeed = world.level.puck.maxspeed
    , bounces = world.puckBounces[puck.index]
    , speed = Math.min(level + speedup*bounces, maxspeed);

  // transfer the fireball effect
  if( paddle.data.fireball ){
    speed *= 1.5; // speed up 20%
    puck.data.fireball = 1; // turn on
    paddle.data.fireball = 2; // turn off
  }

  // without paddle momentum
  // actions.puckSpeed(world,puck,speed)

  // with paddle momentum
  actions.puckSpeedMomentum(world,puck,speed,paddle.velocity)

  if( paddle.index === world.players.a.paddle ){
    dmaf.tell('user_paddle_hit');
  } else {
    actions.emit('opponentPaddleHit');
    dmaf.tell('opponent_paddle_hit');
  }

  actions.emit('renderer','paddleHit',{player: player, velocity: puck.velocity})
}

/**
 * Resizes the paddle to a set scale.
 *
 * Scale is an "absolute" scale. In other words resizing
 * to 1.25 twice will not make a difference.
 *
 * @param  {World} world
 * @param  {Body} paddle
 * @param  {Number} scale  ex. .5 = 50%, 1.5 = 150%, 1 = 100%
 */
exports.resizePaddle = function(world,paddle,scale){
  // keep what was sent in (store as resized below)
  var size = scale;

  // it was previously resized. scale it back first
  // so there'll only be 3 sizes.
  //
  // original size: 50
  // scale 1: 1.5
  // = 50 * 1.5 = 75
  // scale 2: .5
  // = 75 * .5 = 37.5 = FAIL!
  // = 75 * 1 / 1.5 * .5 = 25 = WIN!
  if( paddle.data.resized ){
    size = 1/paddle.data.resized * scale;
  }

  // scale using a transformation matrix
  var c = paddle.current;
  var m = mat.scale(size,1)
  poly.transform(paddle.shape,m)
  poly.aabb(paddle.shape,paddle.aabb)
  mat.free(m);

  if( scale !== 1 ){
    paddle.data.resized = scale;
  } else {
    delete paddle.data.resized;
  }
}

exports.movePaddle = function(world,paddle,dx){
  // sometimes the paddles doesn't exist because the
  // input is received after the reset/game over
  if( !world.paddles.has(paddle) )
    return;

  var p = world.paddles.get(paddle);

  // p.current[0] += dx;

  // Trying to use acceleration instead. The idea
  // is that updating at a lower degree may give
  // a smoother effect after a replay. Because the
  // acceleration will be added a bunch of times
  // while the position will be updated afterwards.
  p.acceleration[0] += dx * 7000;
}


