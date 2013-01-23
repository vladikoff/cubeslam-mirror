var debug = require('debug')('actions:puck')
  , settings = require('../settings')
  , Body = require('../geom-sim/body')
  , shapes = require('../geom-sim/shapes')
  , audio = require('../audio')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

exports.puckSpeed = function(world, id, x){
  debug('speed (current direction) [%s]',id, x)
  if( !world.pucks.has(id) )
    throw new Error('cannot set puck speed, does not exist yet');

  // only a speed (in the current direction)
  var p = world.pucks.get(id);
  var v = vec.sub(p.current,p.previous)
  vec.norm(v,v)
  vec.smul(v,+x,v)
  vec.sub(p.current,v,p.previous)
  vec.free(v)
}


exports.puckSpeedXY = function(world, id, x, y){
  debug('speed [%s]',id, x,y)
  if( !world.pucks.has(id) )
    throw new Error('cannot set puck speed, does not exist yet');

  // set a speed and direction
  var p = world.pucks.get(id);
  var v = vec.make(+x,+y)
  vec.sub(p.current,v,p.previous)
  vec.free(v)
}

exports.puckPush = function(world, id, x, y){
  debug('push [%s] %s,%s',id, x, y)
  if( !world.pucks.has(id) )
    throw new Error('cannot push puck, does not exist yet');
  var p = world.pucks.get(id);
  p.applyForce(+x,+y);
}

exports.puckCreate = function(world, id, x, y, mass, flags){
  debug('create [%s] %s,%s %s', id, x, y, mass, flags)

  // skip pucks that already exists
  // (to avoid multiplayer hickups)
  if( world.pucks.has(id) )
    return console.warn('ignored puckCreate "%s". already exists',id);

  var actions = this;

  var w = settings.data.puckRadius*2
    , h = w // square
    , puck = new Body(shapes.rect(w,h),+x,+y,flags || (Body.DYNAMIC | Body.BOUNCE))
    , p = puck;
  puck.id = id;
  puck.oncollision = function oncollision(q,c){
    debug('oncollision',p.id,Body.flags(p._flags),' > ',q.id,Body.flags(q._flags));

    var hitExtra = world.extras.has(q.id)
      , hitPaddle = world.paddles.has(q.id)
      , hitBullet = world.bullets.has(q.id);

    // hit a paddle
    if( hitPaddle ){

      // position audio
      // 0 = near, -10 = far away
      if( settings.data.sounds ){
        var aw = settings.data.arenaWidth
          , ah = settings.data.arenaHeight
          , ax = p.current[0]/settings.data.arenaWidth-.5*-0.8
          , ay = (1-p.current[1]/settings.data.arenaHeight)*-10
        audio.play3D("hit2", new THREE.Vector3(ax,0,ay));
      }

      var player = q.id == 0 ? 'a' : 'b';

      // mark who hit this particular puck last
      // not setting it on the puck to avoid modifying
      // the Body "class"
      world.lastHitPucks[p.id] = player;

      // we've been kept alive!
      actions.scoreAlive()

      // add some extra power to each hit
      // level.speed * (1 + world.alive * level.speedup)
      // 10 * (1 + 0 * .1) = 10
      // 10 * (1 + 1 * .1) = 11 // +10% from level base
      // 10 * (1 + 2 * .1) = 12 // +20% from level base
      // 10 * (1 + 5 * .1) = 15 // +50% from level base
      // etc.
      // TODO add puck-specific speed? (that can be "upgraded" using fastball extra)
      var speed = world.level.speed * (1 + world.alive * world.level.speedup);
      actions.puckSpeed(puck.id, Math.min(speed, world.level.maxspeed));

      actions.emit('renderer','paddleHit',{player: player, velocity: puck.velocity})

    // hit an extra.
    } else if( hitExtra ){

      // remove extra (unlike obstacles, extras are removed)
      actions.extraDestroy(q.id)

      // do whatever it is the extra does
      actions.extraHit(q.id,p.id)

    // hit an bullet
    } else if( hitBullet ){

      vec.copy(q.current,p.current);
      vec.copy(q.previous,p.previous);
      vec.make(q.velocity,p.velocity);

    }

    world.collisions++
  }

  puck.onbounds = function onbounds(b){
    debug('onbounds',p.id);

    // first see if we hit the bounds behind
    // any player?
    var player = null;
    if( p.current[1] <= h )
      player = 'b';
    else if( p.current[1] >= settings.data.arenaHeight-h  )
      player = 'a';

    // offset b to avoid intersection
    vec.add(p.current, b, p.current)

    // flip velocity by adding it to current
    // (moving the previous ahead)
    if( b[0] ) p.previous[0] = p.current[0] + p.velocity[0]
    if( b[1] ) p.previous[1] = p.current[1] + p.velocity[1]

    // check for player
    if( player ){
      actions.playerHit(player,p.current[0],p.current[1]);

      // add ghosting effect
      // temporary hack
      // TODO fix
      p.addFlags(Body.GHOST);
      setTimeout(function(){
        p.delFlags(Body.GHOST); // turn off
      },1000)

      // and if there's more than one puck left:
      // remove the colliding one
      if( world.pucks.values.length > 1 )
        actions.puckDestroy(p.id);
    }

    world.collisions++
  }
  world.pucks.set(p.id,puck);
  world.bodies.set(p.id,puck);
  world.added.push(puck);
}

exports.puckDestroy = function(world, id){
  debug('ondestroy',id)
  var extra = world.pucks.get(id)
  if( extra ){
    world.pucks.del(id)
    world.bodies.del(id)
    world.removed.push(extra)
  }
}