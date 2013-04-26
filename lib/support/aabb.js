
/**
 * A helper method to see if a body is
 * colliding with any others in the world.
 *
 * @param  {World} world
 * @param  {Body} a
 * @return {Boolean} `true` in case of collision
 */
exports.colliding = colliding;
function colliding(world,a){
  for(var j=0; j < world.bodies.length; j++){
    var b = world.bodies.values[j]
    // skip self
    if( b === a ) {
      continue;
    }

    // fix for preventing obstacles to collide with
    // each other when spawning
    if( b.id == 'obstacle' && a.id == 'obstacle'){
      continue;
    }

    if( intersects(a.aabb,b.aabb) ){
      return true;
    }
  }
  return false;
}

/**
 * Checks if two AABB arrays intersects.
 *
 * Used for a faster `colliding()` check, since velocities
 * are not required for their use (extra creation).
 *
 * @param {AABB} a [t,r,b,l]
 * @param {AABB} b [t,r,b,l]
 * @return {Boolean} `true` if they intersect
 */
exports.intersects = intersects;
function intersects(a,b){
  if( b[3] > a[1] || a[3] > b[1] ) return false;
  if( b[0] > a[2] || a[0] > b[2] ) return false;
  return true;
}