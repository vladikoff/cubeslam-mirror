var debug = require('debug')('sim:physics')
  , settings = require('../settings')
  , onbounds = require('./bounds')
  , oncollision = require('./collision')
  , integration = require('./integration')
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
      wasRemoved.push(a);
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
      oncollision(world,a,b,c);
      vec.free(c.minTranslationVector)
      vec.free(c.nearestEdge)

      // add to remove queue if marked for removal
      a.removed && removed.push(a);
      b.removed && removed.push(b);
    // } else {
    //   console.log('narrowphase not colliding',a.id,b.id)
    //   console.log(' a aabb:',a.aabb.join(','))
    //   console.log(' b aabb:',b.aabb.join(','))
    //   console.log(' intersects?',collisions.intersects(a.aabb,b.aabb))
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
      switch(a.id){
        case 'puck':   onbounds.puck(world,a,o); break;
        case 'bullet': onbounds.bullet(world,a,o); break;
        case 'paddle': onbounds.paddle(world,a,o); break;
        // ignore the rest...
      }
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
function oob(aabb,v,o){
  var bounds = settings.data.bounds;
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
      if( body.id == 'puck'){ // only pucks? what about bullets?
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
