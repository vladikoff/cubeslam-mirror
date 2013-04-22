

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
var src = typeof process == 'undefined' ? 'slam' : '..';
var estimateSlowDown = require(src+'/lib/support/estimate-slow-down')
  , settings = require(src+'/lib/settings');

var d = 200 - 2350;
var t = 1000/15 + 50;
var v = -40;

function step(){
  var m = estimateSlowDown(d,v,t);
  console.log('m: %s d: %s v: %s t: %s',m && m.toFixed(3),d.toFixed(3),(v*m).toFixed(3),t.toFixed(3))

  // update and try again
  // v *= m;
  d -= v;
  // t -= settings.data.timestep;
}

step()
step()
step()
step()
step()
step()
step()
step()
step()
step()
step()
step()
step()
step()
step()
step()
step()
step()
step()
step()

// test with flipped direction
v = -v;
step()

// test with 0 velocity
v = 0;
step()