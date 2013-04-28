var debug = require('debug')('actions:paddle')
  , settings = require('../settings')
  , BodyFlags = require('../sim/body-flags')
  , shapes = require('../sim/shapes')
  , actions = require('../actions')
  , inputs = require('../inputs')
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
    , w = u*5
    , h = u
    , x = aw/2
    , y = (player === world.players.b ? u : ah-u);

  var flags = BodyFlags.DYNAMIC | BodyFlags.BOUNCE | BodyFlags.STEER;
  // if( world.multiplayer ){
  //   flags = BodyFlags.DYNAMIC | BodyFlags.BOUNCE | BodyFlags.DIRECT;
  // }

  var paddle = world.createBody(shapes.rect(w,h),x,y,flags)
  paddle.id = 'paddle' // for debugging mostly
  paddle.damping = settings.data.paddleDamping;
  paddle.mass = settings.data.paddleMass;
  world.paddles.set(paddle.index,paddle);
  actions.emit('added paddle',world,paddle);
  return paddle.index;
}

exports.hitPuckPaddle = function(world,puck,paddle){

  var player = paddle.index === world.players.a.paddle ? 'a' : 'b';

  // only add if puck hit other paddle in between
  if( world.lastHitPucks[puck.index] !== player ){
    world.puckBounces[puck.index]++;
  }

  if( paddle.data.x ){
    console.log('PUCK HIT PADDLE')
    console.log('does data.x match the current x?',paddle.data.x,paddle.current[0])
  }

  // mark who hit it last
  world.lastHitPucks[puck.index] = player;

  // puck was already fireball
  if( puck.data.fireball === 1){
    // make paddle "dizzy"
    actions.dizzyPaddle(world, paddle.index);
    puck.data.fireball = 2; // turn off

    //reset one frame later to allow visual effect
    world.tick.nextFrame('resetPuckExtra',puck.index,'fireball')
    world.tick.nextFrame('resetPaddleExtra',paddle.index,'fireball')
  }

  // figure out puck speed
  var speed = actions.getPuckSpeed(world,puck)

  // transfer the fireball effect
  if( paddle.data.fireball ){
    speed *= settings.data.fireballSpeedup; // speed up 20%
    puck.data.fireball = 1; // turn on
    paddle.data.fireball = 2; // turn off
    //reset one frame later to allow visual effect
    world.tick.nextFrame('resetPaddleExtra',paddle.index,'fireball')
  }

  // without paddle momentum
  if( !settings.data.paddleMomentum ){
    actions.puckSpeed(world,puck,speed)

  // with paddle momentum
  } else {
    // data.vx is set when a HIT() has been
    // received in multiplayer to prepare the predictive
    // "game". should be reset after use
    var vx = paddle.velocity[0];
    if( paddle.data.vx ){
      paddle.velocity[0] = paddle.data.vx;
    }
    actions.puckSpeedMomentum(world,puck,speed,paddle.velocity)

    // remove/reset
    delete paddle.data.vx;
    paddle.velocity[0] = vx;
  }

  if( paddle.index === world.me.paddle ){
    dmaf.tell('user_paddle_hit');
    if( world.multiplayer && world.name == 'game' ){
      inputs.record(inputs.types.HIT,paddle.current[0],paddle.velocity[0])
    }
  } else if( !world.multiplayer || world.name == 'sync' ){
    actions.emit('opponentPaddleHit'); // used by AI
    dmaf.tell('opponent_paddle_hit');
  }

  actions.emit('renderer','paddleHit',{player: player, velocity: puck.velocity})
  actions.puckBounced(world,puck)
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
exports.resizePaddle = function(world,paddleIndex,scale){
  // keep what was sent in (store as resized below)
  var size = scale;

  // get paddle
  var paddle = world.paddles.get(paddleIndex);

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
  var w = paddle.aabb[1] - paddle.aabb[3];
  var m = mat.make()
  mat.translate(-c[0],0,m)
  mat.scale(size,1,m)
  mat.translate(c[0],0,m)
  poly.transform(paddle.shape,m)
  poly.aabb(paddle.shape,paddle.aabb)
  paddle.radius = poly.radius(paddle.shape,c)
  mat.free(m);

  if( scale !== 1 ){
    paddle.data.resized = scale;
  } else {
    delete paddle.data.resized;
  }
}

exports.movePaddle = function(world,paddleIndex,dx){
  // sometimes the paddles doesn't exist because the
  // input is received after the reset/game over
  if( !world.paddles.has(paddleIndex) )
    return;

  var paddle = world.paddles.get(paddleIndex);

  // p.current[0] += dx;

  // Trying to use acceleration instead. The idea
  // is that updating at a lower degree may give
  // a smoother effect after a replay. Because the
  // acceleration will be added a bunch of times
  // while the position will be updated afterwards.
  paddle.acceleration[0] += dx/settings.data.timestep;
}

exports.paddleShoot = function(world,paddleIndex){
  debug('%s paddle shoot', world.name, paddleIndex)
  var paddle = world.paddles.get(paddleIndex);
  dmaf.tell('laser_fire');
  actions.createBullet(world,paddle);
}

exports.dizzyPaddle = function(world,paddleIndex){
  debug('%s dizzy paddle', world.name, paddleIndex)
  var paddle = world.paddles.get(paddleIndex);
  paddle.data.dizzyTimes = 0;
  world.tick.clearInterval(paddle.data.dizzyInterval)
  paddle.data.dizzyInterval = world.tick.setInterval('dizzyToggleDirection',100,paddleIndex)
  dmaf.tell('paddle_dizzy');
}

exports.dizzyToggleDirection = function(world,paddleIndex){
  var paddle = world.paddles.get(paddleIndex);

  paddle.data.dizzyDirection = paddle.data.dizzyDirection || 1;
  paddle.data.dizzyDirection *= -1;
  actions.movePaddle(world,paddle.index,paddle.data.dizzyDirection*12);

  if( ++paddle.data.dizzyTimes > 15 ){
    world.tick.clearInterval(paddle.data.dizzyInterval)
  }
}

exports.resetPaddleExtra = function(world,paddleIndex,extraType) {
  debug('%s reset paddle extra', world.name, paddleIndex, extraType)
  var paddle = world.paddles.get(paddleIndex);
  if( paddle && paddle.data.hasOwnProperty(extraType)) {
    paddle.data[extraType] = 0;
  }
}
