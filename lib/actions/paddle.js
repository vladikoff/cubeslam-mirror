var debug = require('debug')('actions:paddle')
  , settings = require('../settings')
  , BodyFlags = require('../geom-sim/body-flags')
  , shapes = require('../geom-sim/shapes')
  , actions = require('../actions')
  , audio = require('../audio')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;


exports.createPaddle = function(world,player){
  debug('create',player)
  var aw = settings.data.arenaWidth
    , ah = settings.data.arenaHeight
    , u = settings.data.unitSize
    , w = u*4
    , h = u
    , x = aw/2
    , y = (player === world.players.b ? u*1.5 : ah-u*1.5);
  var paddle = world.createBody(shapes.rect(w,h),x,y,BodyFlags.DYNAMIC | BodyFlags.BOUNCE | BodyFlags.STEER)
  paddle.id = 'paddle' // for debugging mostly
  paddle.damping = settings.data.paddleDamping;
  paddle.mass = settings.data.paddleMass;
  world.paddles.set(paddle.index,paddle)
  return paddle.index;
}

exports.hitPaddle = function(world,puck,paddle){
  // position audio
  // 0 = near, -10 = far away
  if( settings.data.sounds ){
    var aw = settings.data.arenaWidth
      , ah = settings.data.arenaHeight
      , ax = puck.current[0]/aw-.5*-0.8
      , ay = (1-puck.current[1]/ah)*-10
    audio.play3D("hit2", new THREE.Vector3(ax,0,ay));
  }

  var player = paddle.index == world.players.a.paddle ? 'a' : 'b';

  // mark who hit this particular puck last
  // not setting it on the puck to avoid modifying
  // the Body "class"
  world.lastHitPucks[puck.index] = player;
  world.puckBounces[puck.index] = (world.puckBounces[puck.index] || 0) + 1;

  // we've been kept alive!
  actions.scoreAlive(world)

  // add some extra power to each hit
  // level.speed * (1 + world.alive * level.speedup)
  // 10 * (1 + 0 * .1) = 10
  // 10 * (1 + 1 * .1) = 11 // +10% from level base
  // 10 * (1 + 2 * .1) = 12 // +20% from level base
  // 10 * (1 + 5 * .1) = 15 // +50% from level base
  // etc.
  // TODO add puck-specific speed? (that can be "upgraded" using fastball extra)
  // var speed = world.level.speed * (1 + world.alive * world.level.speedup);
  // actions.puckSpeed(world, p, Math.min(speed, world.level.maxspeed));
  // actions.puckSpeed(world,puck,world.level.speed)

  //20+1*(1.2*1.2*1.2*1.2)
  var level = world.level.puck.speed
    , speedup = world.level.puck.speedup
    , maxspeedup = world.level.puck.maxspeedup
    , bounces = world.puckBounces[puck.index]
    , speed = level * Math.min(Math.pow(speedup,bounces), maxspeedup);
  console.log('speed',speed)
  actions.puckSpeed(world,puck,speed)

  actions.emit('renderer','paddleHit',{player: player, velocity: puck.velocity})
}

exports.resizePaddle = function(world,paddle,size){
  // TODO size should be a multiplier (ex. .5 = 50%, 1.5 = 150%, 1 = 100%)
}

exports.movePaddle = function(world,paddle,dx){
  var p = world.paddles.get(paddle);
  p.current[0] += dx;
}