var vec = require('geom').vec
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

  console.log('interpolating over %s frames',frames)

  // interpolate pucks
  for(var i=0; i<after.pucks.length; i++){
    var a = after.pucks.values[i];
    if( before.pucks.has(a.index) ){
      interpolateBody(a,before.pucks.get(a.index),frames)
    }
  }

  // interpolate paddles
  for(var i=0; i<after.paddles.length; i++){
    var a = after.paddles.values[i];
    if( before.paddles.has(a.index) ){
      interpolateBody(a,before.paddles.get(a.index),frames)
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
    return;
  }

  // target is "after" + velocity*frames
  var t = vec.copy(b.current);
  // var v = vec.smul(b.velocity,f);
  // vec.add(t,v,t)
  // vec.free(v)

  // skip if distance is too large or small
  var maxDist = settings.data.interpolationMaxDistance*f // max px/frame
    , minDist = settings.data.interpolationMinDistance*f
    , dist = vec.distSq(a.current,t);

  if( dist < minDist*minDist || dist > maxDist*maxDist ){
    console.log('skipping interpolation for %s (dist: %s)',a.index,Math.sqrt(dist))
  } else {
    i.offset = vec.sub(a.current,t);
    i.step = 1/f;
    i.frames = f;
    console.log('interpolating %s over %s %s frames',a.id,i.offset.join(','),f)
  }

  vec.free(t)

  // no need to free i.offset, it will be freed when done
}