console.log('require physics')
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

    // check if colliding with other bodies
    for(var j=0; j<world.bodies.length; j++){
      // skip self
      if( i === j ) continue;

      var b = world.bodies.values[j];

      // skip removed bodies
      if( b.removed ){
        wasRemoved.push(b);
        continue;
      }

      // skip shield > shield collisions
      if( a.id == 'shield' && b.id == 'shield' )
        continue;

      // skip paddle > paddle collisions
      if( a.id == 'paddle' && b.id == 'paddle' )
        continue;

      // skip shield > paddle collisions
      if( a.id == 'shield' && b.id == 'paddle' )
        continue;

      // skip paddle > shield collisions
      if( a.id == 'paddle' && b.id == 'shield' )
        continue;

      // skip obstacle > obstacle collisions
      if( a.id == 'obstacle' && b.id == 'obstacle' )
        continue;

      // if closer than radius+velocity it may collide
      var ar = a.radiusSq + vec.lenSq(a.velocity);
      var br = b.radiusSq + vec.lenSq(b.velocity);
      var d = vec.distSq(a.current,b.current);
      if( d-(ar+br) < 0 ){
        // TODO should we check if the pair is in mayCollide first?
        mayCollide.push(a,b);
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

    // make sure a is puck if any is puck
    if( b.id == 'puck' ){
      var o = a;
      a = b;
      b = o;
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
      // console.log('narrowphase not colliding',a.index,b.index)
    }
  }
  vec.free(v);
}

function checkbounds(world,removed){
  for(var i=0; i<world.bodies.length; i++){
    var a = world.bodies.values[i];

    // skip shield
    if( a.id == 'shield' )
      continue;

    // skip obstacles
    if( a.id == 'obstacle' )
      continue;

    // check bounds
    var hit = oob(a.aabb)
    if( hit ){
      // console.log('HIT BOUNDS OK?!',a.id,a.index,bounds)
      collisions.onbounds(world,a,hit);
      vec.free(hit);
    }

    // skip removed bodies
    if( a.removed ){
      removed.push(a);
      continue;
    }
  }
}

// assumes bounds and aabb = [t,r,b,l]
// if overlap it will return it as a vector
var bounds;
function oob(aabb){
  bounds = bounds || [0,settings.data.arenaWidth,settings.data.arenaHeight,0];
  var o = vec.make();
  if( aabb[0] < bounds[0] )
    o[1] = bounds[0] - aabb[0];
  if( aabb[1] > bounds[1] )
    o[0] = bounds[1] - aabb[1];
  if( aabb[2] > bounds[2] )
    o[1] = bounds[2] - aabb[2];
  if( aabb[3] < bounds[3] )
    o[0] = bounds[3] - aabb[3];
  if( o[0] !== 0 || o[1] !== 0 )
    return o;
  vec.free(o)
  return null;
}

function collide(world,a,b,c){
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


  } else {
    // we know now that it will intersect. but we don't know exactly when...

  }



  // will intersect. act depending on flags.

  // console.log('collide intersect: %s willIntersect: %s',c.intersect,c.willIntersect,a.id,a.index,b.id,b.index)

  // GHOST
  if( BodyFlags.has(a,BodyFlags.GHOST) && !BodyFlags.has(b,BodyFlags.STATIC) ){
    // console.log("GHOST COLLISION!")
    // just ignoring for now
    // but maybe even skip oncollision()?
    // and should it bounce off of STATICs?

  // BOUNCE
  } else if( BodyFlags.has(a,BodyFlags.BOUNCE) && BodyFlags.has(b,BodyFlags.BOUNCE) ){
    if( BodyFlags.has(b,BodyFlags.STEER) ){
      // console.log("BOUNCE STEER!")
      // divide the diff w. width to get the x normal
      var I = vec.norm(a.velocity)
        , n = vec.perp(c.nearestEdge)
        , r = vec.reflect(I,vec.norm(n,n))
        , l = vec.len(a.velocity)
        , d = (a.current[0] - b.current[0])/(a.aabb[1]-b.aabb[3]);

      // normalizing again to avoid any additional velocity
      r[0] = d
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
