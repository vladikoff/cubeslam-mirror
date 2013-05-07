var debug = require('debug')('actions:puck')
  , actions = require('../actions')
  , settings = require('../settings')
  , BodyFlags = require('../sim/body-flags')
  , shapes = require('../sim/shapes')
  , icons = require('../extra-icons')
  , colliding = require('../support/aabb').colliding
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , dmaf = require('../dmaf.min');


exports.createPuckCenter = function(world){
  // add to center of arena
  var x = settings.data.arenaWidth/2
    , y = settings.data.arenaHeight/2
    , mass = 5
    , p = actions.createPuck(world,x,y,mass);

  // always start with 0 "bounces"
  var speed = actions.getPuckSpeed(world,p)
  speed *= settings.data.unitSpeed;

  // start it off with a push
  actions.puckSpeedXY(world, p, 0, speed)
}

exports.createPuck = function(world, x, y, mass, flags){
  debug('%s create %s,%s %s',world.name, x, y, mass, flags)
  var w = settings.data.unitSize
    , h = w // square
    , p = world.createBody(shapes.rect(w,h), x, y, flags || (BodyFlags.DYNAMIC | BodyFlags.BOUNCE))
  p.id = 'puck' // for debugging mostly

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
  if( !world.pucks.has(p.index) ){
    return console.warn('cannot set puck speed, does not exist yet');
  }

  // s = multiplier of unit speed (ex. speed*speedup^bounces)

  // only a speed (in the current direction)
  var v = vec.sub(p.current,p.previous)
  vec.norm(v,v)
  vec.smul(v,s*settings.data.unitSpeed,v)
  vec.sub(p.current,v,p.previous)
  vec.free(v)
}

exports.getPuckSpeed = function(world,puck){
  // add some extra power to each hit
  // unit * (speed+speedup*bounces)
  // 20 * (1+0) > 20 * (1+.2) > 20 * (1+.4)
  // ex. 20 > 20 * 1.2 > 20 * 1.4 > ... > 20 * 4
  var level = world.level.puck.speed
    , speedup = world.level.puck.speedup
    , maxspeed = world.level.puck.maxspeed
    , bounces = world.puckBounces[puck.index];

  return Math.min(level + speedup*bounces, maxspeed);
}

exports.puckSpeedMomentum = function(world, p, s, m){
  debug('%s speed (w. momentum) [%s]',world.name ,p.index, s, m)

  // see puckSpeed()
  if( !world.pucks.has(p.index) ){
    return console.warn('cannot set puck speed, does not exist yet');
  }

  // add extra speed and damp until the speed is
  // back to normal
  if( settings.data.speedupMomentum && Math.abs(m[0]) > 1 ){
    // moment as scalar
    var ms = Math.min(vec.len(m), settings.data.unitSpeed);

    p.dampUntil = s*settings.data.unitSpeed;
    p.damping = 0.97;

    s += ms/8;
  }

  // only a speed (in the current direction)
  var v = vec.sub(p.current,p.previous)

  // momentum changes direction
  if( settings.data.directionMomentum ){
    vec.add(v,m,v)
  }

  vec.norm(v,v)
  vec.smul(v,s*settings.data.unitSpeed,v)
  vec.sub(p.current,v,p.previous)
  vec.copy(v,p.velocity)
  vec.free(v)
}

exports.puckSpeedXY = function(world, p, x, y){
  debug('%s speed [%s]',world.name , p.index, x, y)

  // see puckSpeed()
  if( !world.pucks.has(p.index) ){
    return console.warn('cannot set puck speed, does not exist yet');
  }

  // set a speed and direction
  var v = vec.make(x,y)
  vec.sub(p.current,v,p.previous)
  vec.copy(v,p.velocity)
  vec.free(v)
}

exports.puckCheckMinSpeed = function(world, p){
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

    // apply speed
    actions.puckSpeedXY(world,p,p.velocity[0],minY);
  }

  // also make sure it has a minimum velocity (unitSpeed)
  // in any direction so force fields et al won't ruin the
  // fun.
  // using a calculated velocity since p.velocity may be outdated
  var speed = vec.dist(p.current,p.previous) / settings.data.unitSpeed;
  var minSpeed = 1;
  if( speed < minSpeed ){
    debug('puck was below min speed %s now at a comfortable %s',speed,minSpeed)
    actions.puckSpeed(world,p,minSpeed);
  }
}

exports.puckCheckMaxSpeed = function(world, p){
  debug('check speed',p.index)

  // skip if it has been removed
  // (like when this is called from Bound.puck)
  if( p.removed ){
    return;
  }

  var speed = vec.dist(p.current,p.previous) / settings.data.unitSpeed;
  var maxSpeed = world.level.puck.maxspeed + world.level.puck.maxspeed*0.5*(p.data.fireball==1);
  if( speed > maxSpeed && !p.dampUntil ){
    debug('puck was above max speed %s now at a comfortable %s',speed,maxSpeed)
    actions.puckSpeed(world,p,maxSpeed);

    // if extreme debug!
    if( speed > maxSpeed * 10 ){
      throw new Error('puck is extremely fast. must be a bug. investigate!');
    }
  }
}

exports.puckCheckSpeedAll = function(world, p){
  for(var i=0; i < world.pucks.length; i++){
    actions.puckCheckMinSpeed(world, world.pucks.values[i]);
    actions.puckCheckMaxSpeed(world, world.pucks.values[i]);
  }
}

exports.destroyPuck = function(world, puck){
  debug('%s destroy',world.name ,puck.index);
  delete world.lastHitPucks[puck.index];
  delete world.puckBounces[puck.index];
  world.pucks.del(puck.index)
  world.releaseBody(puck)
  actions.emit('removed','puck',world,puck);
}

exports.puckBounced = function(world,puck) {
  actions.emit('renderer','puckBounce',{puck: puck});

  //console.log('%s puck bounced angle: %s speed: %s',world.name,(Math.atan2(puck.velocity[1],puck.velocity[0])*180/Math.PI).toFixed(4),vec.len(puck.velocity))

  // after the hit, and if it's still alive, we
  // make sure it has a minimum y-velocity so the
  // game doesn't get stuck.
  actions.puckCheckMinSpeed(world,puck)
}

exports.puckToggleHit = function(world,puckIndex,hit){
  var puck = world.pucks.get(puckIndex);
  puck.data.hitShield = hit;
}

exports.puckToggleGhostball = function(world,puckIndex,extraIndex){
  var puck = world.pucks.get(puckIndex);
  if( puck.data.ghostball ){
    puck.data.ghostball = 2;
    dmaf.tell('ghostball_over');
    icons.remove(world,extraIndex);
    delete puck.data.ghostballTimeout;
    world.tick.nextFrame('resetPuckExtra',puck.index,'ghostball')
    puck.data.ghostIcon = extraIndex;
  } else {
    puck.data.ghostball = 1;
    icons.activate(world,extraIndex);
    delete puck.data.ghostIcon;
  }
}

exports.puckToggleGhostFlag = function(world,puckIndex,active){
  var puck = world.pucks.get(puckIndex);
  if( active ){
    debug('puck GHOST ADD %s %s %s',world.name,world.frame,puck.index)
    BodyFlags.add(puck,BodyFlags.GHOST);
  } else {
    // if it's colliding when GHOST wears off
    // wait a try again next frame
    if( colliding(world,puck) ){
      debug('puck was colliding when GHOST wore off. trying again next frame.')
      return world.tick.nextFrame('puckToggleGhostFlag',puckIndex);
    }
    BodyFlags.del(puck,BodyFlags.GHOST)
    debug('puck GHOST DEL %s %s %s',world.name,world.frame,puck.index)
  }
}

exports.puckTimebombExplode = function(world,puckIndex,extraIndex,radius){
  var puck = world.pucks.get(puckIndex);

  // visual and audial boom!
  puck.data.timebomb = 2;
  dmaf.tell('timebomb_over');
  world.tick.nextFrame('resetPuckExtra',puck.index,'timebomb')
  icons.remove(world,extraIndex);
  delete puck.data.bombTimeout;

  // query which shields are within radius
  // and destroy them!
  var radSq = radius*radius
    , destroyed = [];
  for(var i=0; i<world.shields.length;i++){
    var shield = world.shields.values[i];
    var distSq = vec.distSq(puck.current,shield.current)
    if( distSq < radSq ){
      // no good to destroy within loop because
      // stashes are unordered
      shield.data.blownAway = 1;
      destroyed.push(shield);
    }
  }
  while( destroyed.length ){
    actions.destroyShield(world,destroyed.pop());
  }
}

exports.resetPuckExtra = function(world,puckIndex,extraType) {
  var puck = world.pucks.get(puckIndex);
  if( puck && puck.data.hasOwnProperty(extraType)) {
    puck.data[extraType] = 0;
  }
}
