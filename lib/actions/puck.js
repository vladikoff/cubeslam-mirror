var debug = require('debug')('actions:puck')
  , settings = require('../settings')
  , Body = require('../geom-sim/body')
  , shapes = require('../geom-sim/shapes')
  , audio = require('../audio')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

exports.puckSpeed = function(world, id, x, y){
  debug('speed [%s]',id, x,y)
  var p = world.pucks.get(id);

  if( !p )
    throw new Error('cannot set puck speed, does not exist yet');

  // only a speed (in the current direction)
  var v = vec.make()
  if( arguments.length == 2 ){
    vec.sub(p.current,p.previous,v)
    vec.norm(v,v)
    vec.smul(v,+x,v)

  // with a direction
  } else {
    v[0] = +x
    v[1] = +y

  }

  vec.sub(p.current,v,p.previous)
  vec.free(v)
}

exports.puckPush = function(world, id, x, y){
  debug('push [%s] %s,%s',id, x, y)
  var p = world.pucks.get(id);
  if( !p )
    throw new Error('cannot push puck, does not exist yet');
  else
    p.applyForce(+x,+y);
}

exports.puckSync = function(world /*id0,cx0,cy0,px0,py0,id1,cx1,cy1,px1,py1...*/){
//   debug('puck sync')

//   // send the positions of all the pucks
//   if( !arguments.length ){
//     buffer.push('pa', world.frame)
//     for(var i=0; i < world.pucks.values.length; i++ ){
//       var p = world.pucks.values[i];
//       buffer.push(p.id,p.current[0],p.current[1],p.previous[0],p.previous[1]);
//     }
//     buffer.push(EOP)


//   // apply the positions of the pucks
//   } else {
//     for(var i=0; i < arguments.length; i+=5){
//       var id =  arguments[i+0]
//         , cx = +arguments[i+1]
//         , cy = +arguments[i+2]
//         , px = +arguments[i+3]
//         , py = +arguments[i+4]
//         , p  = world.pucks.get(id);
//       if( p ){
//         p.current[0] = cx;
//         p.current[1] = cy;
//         p.previous[0] = px;
//         p.previous[1] = py;
//       } else {
//         console.warn('puck sync could not find puck "%s"',id)
//       }
//     }
//   }
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
    , puck = new Body(shapes.rect(w,h),+x,+y,flags)
    , p = puck;
  puck.id = id;
  puck.oncollision = function oncollision(q,c){
    debug('oncollision',p.id);

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

      // mark who hit this particular puck last
      // not setting it on the puck to avoid modifying
      // the Body "class"
      world.lastHitPucks[p.id] = q.id == 0 ? 'a' : 'b';

      // we've been kept alive!
      actions.scoreAlive()

      // add some extra power to each hit
      // level.speed * (1 + world.alive * level.speedup)
      // 10 * (1 + 0 * .1) = 10
      // 10 * (1 + 1 * .1) = 11 // +10% from level base
      // 10 * (1 + 2 * .1) = 12 // +20% from level base
      // 10 * (1 + 5 * .1) = 15 // +50% from level base
      // etc.
      var speed = world.level.speed * (1 + world.alive * world.level.speedup);
      // TODO add puck-specific speed? (that can be "upgraded" using fastball extra)
      // actions.puckSpeed(puck.id, Math.min(speed, world.level.maxspeed));

      // world.renderer.triggerEvent("paddleHit", {player: q.id==0?"a":"b", velocity:puck.velocity});

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
      p.flags |= Body.GHOST;

      // temporary hack
      // TODO fix
      console.log('added ghost')
      setTimeout(function(){
        console.log('removed ghost')
        p.flags &= ~Body.GHOST; // turn off
      },1000)

      // and if host, try to sync
      if( world.host ){
        // and if there's more than one puck left:
        // remove the colliding one
        if( world.pucks.values.length > 1 )
          actions.puckDestroy(p.id);
      }
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