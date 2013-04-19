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


/*
var d = puck.current[1] - paddle.current[1];
var v = puck.velocity[1];
var t = 1000/settings.data.sendRate + ctx.latency;
var t2 = d/v * settings.data.timestep // the time it can take the puck to get to the paddle
var t3 = t2 + t  // the time we want it to take the puck to get to the paddle
var v2 = t2/t3 * v; // the new y-velocity we want it to have
var s = v2/v; // a multiplier add to the current speed (will this be enough, this is just the y-axis multiplier...)


ex.

d = 1500 - 40 = 1460 // 1000
t = 1000/15+50 = ~116
v = 40
t2 = (1000/40 * ~16.6) = 25*16.6 = 415
t3 = t2 + 116 = 531
v2 = 415/531 * 40 = ~31.3
s = 31.3/40 = ~0.78

// second time (should return multiplier closer to 1)
d = 1000-31.3 = ~968
t = 1000/15+50 = ~116
v = 31.3
t2 = (968/31.3 * ~16.6) = 30.92*16.6 = 513.27
t3 = 513.27 + 116 = 629.27
v2 = 513.27/629.27 * 31.3 = ~25.53
s = 25.53/31.3 = ~0.82

// third time (should return multiplier closer to 1)
d = 968-25.53 = ~942.47
t = 1000/15+50 = ~116
v = 25.53
t2 = (942.47/25.53 * ~16.6) = 36.92*16.6 = 612.87
t3 = 612.87 + 116 = 728.87
v2 = 612.87/728.87 * 25.53 = ~21.47
s = 21.47/25.53 = ~0.84
*/