var debug = require('debug')('sim:interpolate')
  , vec = require('geom').vec
  , settings = require('../settings');

/**
 * Adds properties to bodies `interpolate` object
 * which will be used in the integration to smooth
 * things about a bit between the two worlds.
 *
 * It should ignore interpolating if the difference is too
 * small.
 *
 *  ex.
 *
 *    {
 *      offset: vec.sub(before.current,after.current),
 *      step: 1/f, // ex 1/10 = .1
 *      frames: f   // ex 10 so
 *    }
 *
 *
 * @param {World} before The (temporary) world before the replay
 * @param {World} after The current world after the replay
 */
module.exports = function interpolate(before, after, frames){
  frames = Math.min(settings.data.interpolationMaxFrames,frames)
  if( !frames ){
    return;
  }

  // interpolate pucks
  for(var i=0; i<after.pucks.length; i++){
    var a = after.pucks.values[i];
    if( before.pucks.has(a.index) ){
      interpolateBody(a,before.pucks.get(a.index),frames)
    }
  }
}

// applies the interpolation to a single body
function interpolateBody(a,b,f){
  var i = a.interpolate;

  // skip if it already has interpolation
  // TODO should we re-create instead and make
  //      sure we free the old ones first?
  if( i.frames ){
    // vec.free(i.offset)
    // i.offset = null
    // i.frames = null
    console.log('skipping interpolation of %s because it already has one')
    return;
  }

  // skip if distance is too large or small
  var maxDist = settings.data.interpolationMaxDistance
    , minDist = settings.data.interpolationMinDistance
    , dist = vec.distSq(a.current,b.current);

  if( dist < minDist*minDist ){
    debug('skipping too short interpolation for %s (dist: %s)',a.index,Math.sqrt(dist))
  } else if( dist > maxDist*maxDist ){
    debug('skipping too long interpolation for %s (dist: %s)',a.index,Math.sqrt(dist))
  } else {
    i.offset = vec.sub(b.current,a.current);
    vec.copy(i.offset,a.offset)
    i.step = 1/(f+1);
    i.frames = f;
  }

  // no need to free i.offset, it will be freed when done
}