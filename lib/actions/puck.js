var debug = require('debug')('actions:puck')
  , actions = require('../actions')
  , settings = require('../settings')
  , BodyFlags = require('../sim/body-flags')
  , shapes = require('../sim/shapes')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;


exports.createPuckCenter = function(world){
  // add to center of arena
  var x = settings.data.arenaWidth/2
    , y = settings.data.arenaHeight/2
    , mass = 5
    , p = this.createPuck(world,x,y,mass);

  // always start with 0 "bounces"
  var speed = settings.data.unitSpeed * world.level.puck.speed;

  // start it off with a push
  this.puckSpeedXY(world, p, 0, speed)
}

exports.createPuck = function(world, x, y, mass, flags){
  debug('%s create [%s] %s,%s %s',world.name , x, y, mass, flags)
  var w = settings.data.unitSize
    , h = w // square
    , p = world.createBody(shapes.rect(w,h), x, y, flags || (BodyFlags.DYNAMIC | BodyFlags.BOUNCE))
  p.id = 'puck' // for debugging mostly

  // used for ghost blink
  p.data.blinkAmount = 0;

  // set a puck bounce counter
  // TODO move to p.data.bounces?
  world.puckBounces[p.index] = 0;
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
    p.dampUntil = s*settings.data.unitSpeed;
    p.damping = 0.97;

    s += ms/8;
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
  debug('check speed',p.index)

  // skip if it has been removed
  // (like when this is called from Bound.puck)
  if( p.removed ){
    return;
  }


  // make sure it has a minimum y-velocity so the
  // game doesn't get stuck.
  var minY = settings.data.minYSpeed;
  if( Math.abs(p.velocity[1]) < minY ){
    // correct the sign
    minY = p.velocity[1] > 0 ? minY : -minY;

    debug("apply min y ",p.velocity[1],minY);

    // apply speed
    actions.puckSpeedXY(world,p,p.velocity[0],minY);
  }

  // also make sure it has a minimum velocity (unitSpeed)
  // in any direction so force fields et al won't ruin the
  // fun.
  // using a calculated velocity since p.velocity may be outdated
  var speed = vec.dist(p.current,p.previous) / settings.data.unitSpeed;
  var minSpeed = 1;
  var maxSpeed = world.level.puck.maxspeed + world.level.puck.maxspeed*0.5*(p.data.fireball==1);
  if( speed < minSpeed ){
    debug('puck was below min speed %s now at a comfortable %s',speed,minSpeed)
    actions.puckSpeed(world,p,minSpeed);

  } else if( speed > maxSpeed && !p.dampUntil ){
    debug('puck was above max speed %s now at a comfortable %s',speed,maxSpeed)
    actions.puckSpeed(world,p,maxSpeed);

    // if extreme debug!
    if( speed > maxSpeed * 10 ){
      throw new Error('puck is extremely fast. must be a bug. investigate!');
    }
  }
}

exports.puckPush = function(world, p, x, y){
  debug('%s push [%s] %s,%s',world.name ,p.index, x, y)
  if( !world.pucks.has(p.index) )
    throw new Error('cannot push puck, does not exist yet');
  p.applyForce(+x,+y);
}

exports.destroyPuck = function(world, puck){
  debug('%s destroy',world.name ,puck.index)
  delete world.lastHitPucks[puck.index]
  delete world.puckBounces[puck.index]
  world.pucks.del(puck.index)
  world.releaseBody(puck)
  actions.emit('removed','puck',world,puck);
}

exports.puckBounced = function(world,puck) {
  actions.emit('renderer','puckBounce',{puck: puck});

  // after the hit, and if it's still alive, we
  // make sure it has a minimum y-velocity so the
  // game doesn't get stuck.
  actions.puckCheckSpeed(world,puck)
}


