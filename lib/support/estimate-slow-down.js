var settings = require('../settings')

/**
 * Calculates a multiplier how much to slow
 * down to adjust the arrival for latency.
 *
 *
 *   // use
 *   var paddle = world.paddles.get(world.opponent.paddle);
 *   var puck = world.pucks.values[0];
 *   var time = 1000/settings.data.sendRate + ctx.latency;
 *   var m = estimateSlowDown(paddle.current[1] - puck.current[1],puck.velocity[1],t)
 *   // returns null if the puck is going in the wrong direction
 *
 *   if( m != null ){
 *     // based on the sync puck or we'll have a squared decceleration.
 *     var spuck = ctx.sync.world.pucks.get(puck.index)
 *     vec.smul(spuck.velocity,m,puck.velocity);
 *     vec.sub(puck.current,puck.velocity,puck.previous)
 *   } else {
 *     replay = true;
 *   }
 *
 *
 * @param  {Number} d The distance to travel (ex. b[1]-a[1])
 * @param  {Number} v The current velocity (ex. a[1])
 * @param  {Number} t The time to adjust for (ex. ctx.latency)
 * @return {Number} A number to multiply the current velocity by. Or null if going in the opposite direction.
 */
module.exports = function estimateSlowDown(d,v,t){
  // no velocity means "keep it up!"
  if( !v || !d || !t ){
    return 1;
  }

  // check the direction first
  if( !sameSign(d,v) ){
    return null;
  }

  // the time it can take the puck to get to the paddle
  var t2 = d/v * settings.data.timestep;

  // the time we want it to take the puck to reach the paddle
  var t3 = t2 + t;

  // return a multiplier
  return t2/t3;

  // the new velocity required
  var v2 = t2/t3*v;
}

function sameSign(x, y){
  return (x >= 0) ^ (y < 0);
}
