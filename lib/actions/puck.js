var debug = require('debug')('actions:puck')
  , actions = require('../actions')
  , settings = require('../settings')
  , BodyFlags = require('../geom-sim/body-flags')
  , shapes = require('../geom-sim/shapes')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;


exports.puckCreateCenter = function(world){
  // add to center of arena
  var x = settings.data.arenaWidth/2
    , y = settings.data.arenaHeight/2
    , mass = 5
    , p = this.puckCreate(world,x,y,mass);

  // always start with 0 "bounces"
  var speed = settings.data.unitSpeed * world.level.puck.speed;

  // TODO change the initial direction

  // start it off with a push
  this.puckSpeedXY(world, p, 0, speed)
}

exports.puckCreate = function(world, x, y, mass, flags){
  debug('create [%s] %s,%s %s', x, y, mass, flags)
  var w = settings.data.puckRadius*2
    , h = w // square
    , p = world.createBody(shapes.rect(w,h), x, y, flags || (BodyFlags.DYNAMIC | BodyFlags.BOUNCE))
  p.id = 'puck' // for debugging mostly
  world.pucks.set(p.index,p);
  return p;
}

exports.puckSpeed = function(world, p, x){
  debug('speed (current direction) [%s]',p.index, x)

  // it's probably a special case like:
  // "hit the end and the paddle in the same frame"
  // where one action will remove it and the other
  // set the speed. but warn just in case.
  if( !world.pucks.has(p.index) )
    return console.warn('cannot set puck speed, does not exist yet');

  // x = multiplier of unit speed (ex. speed*speedup^bounces)

  // only a speed (in the current direction)
  var v = vec.sub(p.current,p.previous)
  vec.norm(v,v)
  vec.smul(v,x*settings.data.unitSpeed,v)
  vec.sub(p.current,v,p.previous)
  vec.free(v)
}


exports.puckSpeedXY = function(world, p, x, y){
  debug('speed [%s]', p.index, x, y)

  // see puckSpeed()
  if( !world.pucks.has(p.index) )
    return console.warn('cannot set puck speed, does not exist yet');

  // set a speed and direction
  var v = vec.make(+x,+y)
  vec.sub(p.current,v,p.previous)
  vec.free(v)
}

exports.puckPush = function(world, p, x, y){
  debug('push [%s] %s,%s',p.index, x, y)
  if( !world.pucks.has(p.index) )
    throw new Error('cannot push puck, does not exist yet');
  p.applyForce(+x,+y);
}

exports.puckDestroy = function(world, p){
  debug('destroy',p.index)
  delete world.lastHitPucks[p.index]
  world.pucks.del(p.index)
  world.releaseBody(p)
}

exports.puckBounced = function(world,p) {
  actions.emit('renderer','puckBounce',{puck: p});
}

