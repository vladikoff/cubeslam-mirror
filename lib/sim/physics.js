var debug = require('debug')('physics')
  , settings = require('../settings')
  , collisions = require('./collisions')
  , integration = require('./integration')
  , BodyFlags = require('./body-flags')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

exports.update = update;

var removed = [];
var bodies = [];
var c = {};


function broadphase(world,mayCollide,wasRemoved){
  for(var i=0; i<world.bodies.length; i++){
    var a = world.bodies.values[i];

    // skip removed bodies
    if( a.removed ){
      wasRemoved.push(b);
      continue;
    }

    // skip any other than puck and bullets
    if( a.id != 'puck' && a.id != 'bullet' ){
      continue;
    }

    // check if colliding with other bodies
    for(var j=0; j<world.bodies.length; j++){
      // skip self
      if( i === j ) continue;

      var b = world.bodies.values[j];

      // whitelist
      if( a.id == 'puck' ){
        switch(b.id){
          case 'puck':
          case 'extra':
          case 'obstacle':
          case 'paddle':
          case 'shield':
            break;
          default:
            continue;
        }
      } else { // bullet
        switch(b.id){
          case 'paddle':
          case 'obstacle':
            break;
          default:
            continue;
        }
      }

      // if closer than radius+velocity it may collide
      var al = vec.len(a.velocity);
      var bl = vec.len(b.velocity);
      var ar = a.radius + al;
      var br = b.radius + bl;
      var d = vec.dist(a.current,b.current);
      var n = d - al - bl;
      if( n-(ar+br) < 0 ){
        // TODO should we check if the pair is in mayCollide first?
        mayCollide.push(a,b);
        console.log('broadphase may collide',a.id,b.id)
      }
    }
  }
}

function narrowphase(world,bodies,removed){
  if( !bodies.length ) return;
  var v = vec.make();
  for(var i=0; i<bodies.length; i+=2){
    var a = bodies[i]
      , b = bodies[i+1];

    // skip if removed
    if( a.removed || b.removed ){
      continue;
    }

    // calculate relative velocity
    vec.sub(a.velocity,b.velocity,v);

    // check for collision
    poly.collides(a.shape,b.shape,v,c);

    // for the ones actually colliding call "oncollision"
    if( c.willIntersect ){
      collide(world,a,b,c);
      vec.free(c.minTranslationVector)
      vec.free(c.nearestEdge)

      // add to remove queue if marked for removal
      a.removed && removed.push(a);
      b.removed && removed.push(b);
    } else {
      console.log('narrowphase not colliding',a.id,b.id,c)
      console.log(' a aabb:',a.aabb)
      console.log(' b aabb:',b.aabb)
    }
  }
  vec.free(v);
}

function checkbounds(world,removed){
  var o = vec.make();
  for(var i=0; i<world.bodies.length; i++){
    var a = world.bodies.values[i];

    // skip shield
    if( a.id == 'shield' )
      continue;

    // skip obstacles
    if( a.id == 'obstacle' )
      continue;

    // check bounds
    var hit = oob(a.aabb,a.velocity,o)
    if( hit ){
      // console.log('HIT BOUNDS OK?!',a.id,a.index,bounds)
      collisions.onbounds(world,a,o);
    }

    // mark removed bodies
    if( a.removed ){
      removed.push(a);
    }
  }
  vec.free(o);
}

// assumes bounds and aabb = [t,r,b,l]
// if overlap it will return it as a vector
// NOTE: it doesn't use the velocity in the Y-axis
//       check to avoid accidental "god mode" when
//       the puck never hits the player.
var bounds;
function oob(aabb,v,o){
  // lazy to avoid require() overflow
  bounds = bounds || [0,settings.data.arenaWidth,settings.data.arenaHeight,0];
  o[0] = o[1] = 0
  if( aabb[0] < bounds[0] )
    o[1] = bounds[0] - (aabb[0] + v[1]);
  if( aabb[1] + v[0] > bounds[1] )
    o[0] = bounds[1] - (aabb[1] + v[0]);
  if( aabb[2] > bounds[2] )
    o[1] = bounds[2] - (aabb[2] + v[1]);
  if( aabb[3] + v[0] < bounds[3] )
    o[0] = bounds[3] - (aabb[3] + v[0]);
  return o[0] !== 0 || o[1] !== 0;
}

function collide(world,a,b,c){
  // GHOST
  if( BodyFlags.has(a,BodyFlags.GHOST) && !BodyFlags.has(b,BodyFlags.STATIC) ){
    // console.log("GHOST COLLISION!")
    // just ignoring for now
    // but maybe even skip oncollision()?
    // and should it bounce off of STATICs?
    return;

  // BOUNCE
  } else if( BodyFlags.has(a,BodyFlags.BOUNCE) && BodyFlags.has(b,BodyFlags.BOUNCE) ){


    // currently intersecting. move apart
    // but don't change the velocity (it should be done below depending on flags)
    // also updates shape so it shouldn't collide again
    // (but it still will in case it's in the willCollide array multiple times)
    // TODO can this "move apart"-thing be applied too many times then?
    var t = c.minTranslationVector;
    if( c.intersect ){
      // console.log('intersecting, will move apart by %s',t.join(','))
      vec.add(a.previous,t,a.previous);
      vec.add(a.current,t,a.current);
      poly.translate(a.shape, t[0] ,t[1]);
      poly.aabb(a.shape,a.aabb);

      // TODO if one is STATIC the other should be pushed. if both are DYNAMIC (!STATIC)
      //      a should add t * .5 and b sub t * .5. (see http://elancev.name/oliver/2D%20polygon.htm)
      if( BodyFlags.has(a,BodyFlags.STATIC) || BodyFlags.has(b,BodyFlags.STATIC) ){
        console.warn('TODO push them apart by 50%')
      }

    } else {
      // we know now that it will intersect. but we don't know exactly when...

    }

    if( BodyFlags.has(b,BodyFlags.DIRECT) ){
      // console.log("BOUNCE DIRECT!")
      var I = vec.norm(a.velocity)
        , n = vec.perp(c.nearestEdge)
        , r = vec.reflect(I,vec.norm(n,n))
        , l = vec.len(a.velocity);

      // add the x-velocity of the paddle to the reflection angle
      var d = b.velocity[0] / 10;
      r[0] += d;

      r[0] /= 4;

      // normalizing again to avoid any additional velocity
      vec.smul(vec.norm(r,r),l,r)

      // update puck positions
      vec.sub(a.current,r,a.previous)

      // update velocity (which is used to check for other collisions)
      vec.copy(r,a.velocity)

      vec.free(r)
      vec.free(I)
      vec.free(n)


    } else if( BodyFlags.has(b,BodyFlags.STEER) ){
      // console.log("BOUNCE STEER!")
      // divide the diff w. width to get the x normal
      var I = vec.norm(a.velocity)
        , n = vec.perp(c.nearestEdge)
        , r = vec.reflect(I,vec.norm(n,n))
        , l = vec.len(a.velocity)
        , d = (a.current[0] - b.current[0])/(a.aabb[1]-b.aabb[3]);

      // divide to make it less horizontal when
      // we have momentum than without momentum
      r[0] = settings.data.paddleMomentum
             ? d/settings.data.steerWidthMomentum
             : d/settings.data.steerWidth;

      // normalizing again to avoid any additional velocity
      vec.smul(vec.norm(r,r),l,r)

      // update puck positions
      vec.sub(a.current,r,a.previous)

      // update velocity (which is used to check for other collisions)
      vec.copy(r,a.velocity)

      vec.free(r)
      vec.free(I)
      vec.free(n)

    } else { // REFLECT
      // console.log("BOUNCE REFLECT!",a.id,a.index)
      var I = vec.norm(a.velocity)
        , n = vec.perp(c.nearestEdge)
        , r = vec.reflect(I,vec.norm(n,n))
        , l = vec.len(a.velocity)

      // make sure it has the original velocity
      vec.smul(r,l,r)

      // console.log('before reflect')
      // console.log(' c:',a.current)
      // console.log(' p:',a.previous)
      // console.log(' v:',a.velocity)

      // update puck positions
      vec.sub(a.current,r,a.previous)

      // update velocity (which is used to check for other collisions)
      vec.sub(a.current,a.previous,a.velocity)

      // console.log('after reflect')
      // console.log(' c:',a.current)
      // console.log(' p:',a.previous)
      // console.log(' v:',a.velocity)

      vec.free(r)
      vec.free(I)
      vec.free(n)
    }
  }

  // oncollision!
  collisions.oncollision(world, a, b, c);
}

function destroy(world,removed){
  while(removed.length){
    var body = removed.pop();
    // there may be duplicates so check if
    // it has a position still
    if( body.current ){
      world.destroyBody(body);
    }
  }
}

function integrate(world,tsq){
  for(var i=0; i < world.bodies.length; i++){
    var body = world.bodies.values[i];

    // apply forces (if any)
    for(var j=0; j < world.forces.length; j++){
      if( body.id == "puck"){ // only pucks? what about bullets?
        integration.force(world.forces.values[j],body);
      }
    }

    integration.body(body,tsq)
  }
}

function update(world,timeStep){
  // skip unless playing or preview
  if( world.state != 'playing' && world.state != 'preview' )
    return;

  bodies.length = 0;
  removed.length = 0;

  // first check proximity and bounds
  broadphase(world,bodies,removed);
  // console.log('post broadphase %s collisions %s removed',bodies.length/2,removed.length)

  // remove from world
  // TODO also remove from `bodies` if found?
  destroy(world,removed);

  // check if actually colliding
  narrowphase(world,bodies,removed);
  // console.log('post narrowphase %s collisions %s removed',bodies.length/2,removed.length)

  // remove from world any that was removed
  // by "oncollision"
  destroy(world,removed);

  // check bounds after integration
  // done after the collisions in case it has reflected
  checkbounds(world,removed);

  // remove from world any that was removed
  // by "onbounds"
  destroy(world,removed);

  // update their position in the world
  integrate(world,timeStep*timeStep);


  // now we're at the next frame
  world.frame += 1;
}
