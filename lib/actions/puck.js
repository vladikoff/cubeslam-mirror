var debug = require('debug')('actions:puck')
  , actions = require('../actions')
  , settings = require('../settings')
  , BodyFlags = require('../sim/body-flags')
  , shapes = require('../sim/shapes')
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
  //this.puckSpeedXY(world, p, speed/26*-18*0.102, speed*0.1)
  this.puckSpeedXY(world, p, 0, speed)
}

exports.puckCreate = function(world, x, y, mass, flags){
  debug('%s create [%s] %s,%s %s',world.name , x, y, mass, flags)
  var w = settings.data.unitSize
    , h = w // square
    , p = world.createBody(shapes.rect(w,h), x, y, flags || (BodyFlags.DYNAMIC | BodyFlags.BOUNCE))
  p.id = 'puck' // for debugging mostly
  world.pucks.set(p.index,p);
  actions.emit('added','puck',world,p);
  return p;
}

exports.puckSpeed = function(world, p, s){
  debug('%s speed (current direction) [%s]',world.name ,p.index, s)

  // it's probably a special case like:
  // "hit the end and the paddle in the same frame"
  // where one action will remove it and the other
  // set the speed. but warn just in case.
  if( !world.pucks.has(p.index) )
    return console.warn('cannot set puck speed, does not exist yet');

  // s = multiplier of unit speed (ex. speed*speedup^bounces)

  // only a speed (in the current direction)
  var v = vec.sub(p.current,p.previous)
  vec.norm(v,v)
  vec.smul(v,s*settings.data.unitSpeed,v)
  vec.sub(p.current,v,p.previous)
  vec.free(v)
}

exports.puckSpeedMomentum = function(world, p, s, m){
  debug('%s speed (w. momentum) [%s]',world.name ,p.index, s, m)

  // see puckSpeed()
  if( !world.pucks.has(p.index) )
    return console.warn('cannot set puck speed, does not exist yet');

  // add extra speed and damp until the speed is
  // back to normal
  if( settings.data.speedupMomentum ){
    var ms = vec.len(m); // moment as scalar
    if( ms > settings.data.unitSpeed ) ms = settings.data.unitSpeed;
    p.dampUntil = s*settings.data.unitSpeed; // squared to avoid sqrt
    p.damping = 0.97;

    s += ms/10;
    // console.log('will damp puck by %s until it is at %s (speed: %s)',p.damping,p.dampUntil,s)
  }

  // only a speed (in the current direction)
  var v = vec.sub(p.current,p.previous)
  vec.add(v,m,v) // momentum changes direction
  vec.norm(v,v)
  vec.smul(v,s*settings.data.unitSpeed,v)
  vec.sub(p.current,v,p.previous)
  vec.free(v)
}

exports.puckSpeedXY = function(world, p, x, y){
  debug('%s speed [%s]',world.name , p.index, x, y)

  // see puckSpeed()
  if( !world.pucks.has(p.index) )
    return console.warn('cannot set puck speed, does not exist yet');

  // set a speed and direction
  var v = vec.make(x,y)
  vec.sub(p.current,v,p.previous)
  vec.free(v)
}

exports.puckCheckSpeed = function(world, p){
  // make sure it has a minimum y-velocity so the
  // game doesn't get stuck.

  var minY = settings.data.minYSpeed;
  if( Math.abs(p.velocity[1]) < minY ){
    // correct the sign
    console.log("apply min y");
    minY = p.velocity[1] > 0 ? minY : -minY;

    // apply speed
    actions.puckSpeedXY(world,p,p.velocity[0],minY);
  }

  // also make sure it has a minimum velocity (unitSpeed)
  // in any direction so force fields et al won't ruin the
  // fun.
  if( vec.len(p.velocity) < settings.data.unitSpeed ){
    actions.puckSpeed(world,p,settings.data.unitSpeed);
  }
}

exports.puckPush = function(world, p, x, y){
  debug('%s push [%s] %s,%s',world.name ,p.index, x, y)
  if( !world.pucks.has(p.index) )
    throw new Error('cannot push puck, does not exist yet');
  p.applyForce(+x,+y);
}

exports.puckDestroy = function(world, puck){
  debug('%s destroy',world.name ,puck.index)
  delete world.lastHitPucks[puck.index]
  delete world.puckBounces[puck.index]
  world.pucks.del(puck.index)
  world.releaseBody(puck)
  actions.emit('removed','puck',world,puck);
}

exports.puckBounced = function(world,puck) {
  actions.emit('renderer','puckBounce',{puck: puck});
}


