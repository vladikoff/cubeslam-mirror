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
    , y = (player === world.players.b ? u : ah-u);
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

  // add some extra power to each hit
  // unit * (speed+speedup*bounces)
  // 20 * (1+0) > 20 * (1+.2) > 20 * (1+.4)
  // ex. 20 > 20 * 1.2 > 20 * 1.4 > ... > 20 * 4
  var level = world.level.puck.speed
    , speedup = world.level.puck.speedup
    , maxspeed = world.level.puck.maxspeed
    , bounces = world.puckBounces[puck.index]
    , speed = Math.min(level + speedup*bounces, maxspeed);

  // without paddle momentum
  // actions.puckSpeed(world,puck,speed)

  // with paddle momentum
  actions.puckSpeedMomentum(world,puck,speed,paddle.velocity)


  if( paddle.index == world.players.a.paddle )
    dmaf.tell('user_paddle_hit');
  else
    dmaf.tell('opponent_paddle_hit');


  actions.emit('renderer','paddleHit',{player: player, velocity: puck.velocity})
}

exports.resizePaddle = function(world,paddle,size){
  // TODO size should be a multiplier (ex. .5 = 50%, 1.5 = 150%, 1 = 100%)
}

exports.movePaddle = function(world,paddle,dx){
  var p = world.paddles.get(paddle);
  p.current[0] += dx;
}