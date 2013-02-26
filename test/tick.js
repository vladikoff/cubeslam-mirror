var Tick = require('../lib/support/tick')
  , tick = new Tick()
  , queue = []
  , times = []
  , running = false;

test(function(next){
  tick.setTimeout(function(){
    next();
  },200)
},200)

test(function(next){
  var id = tick.setTimeout(function(){
    console.assert(false,'this should never happen')
  },200)
  tick.clearTimeout(id);
  setTimeout(next,500);
},500)

test(function(next){
  var times = 5
    , t = now();
  tick.setInterval(function(){
    var n = now()
    console.log('interval',times,n-t)
    t = n;
    --times || next()
  },20)
},100)

test(function(next){
  var times = 5
    , t = now()
    , id;
  id = tick.setInterval(function(){
    --times;
    tick.clearInterval(id);
  },20)
  setTimeout(function(){
    console.assert(times == 4,'should only have been called once:'+times)
    next()
  },100)
},100)

var world = {frame: 0}
  , total = 0
  , t = now();
var interval = setInterval(function(){
  total += now()-t;
  world.frame++;
  tick.update(world)
},1000/60)
tick.update(world)
console.log('running at framerate:',1000/60)

function test(fn,time){
  queue.push(fn);
  times.push(time);
  if( !running ){
    running = true;
    next();
  }
}
function next(err){
  console.assert(!err,err && err.message);
  var fn = queue.shift()
    , time = times.shift()
    , t = now();
  if( fn ){
    var timedOut = false;
    var timeout = setTimeout(function(){
      timedOut = true;
      next(new Error('timed out'))
    },3000)
    fn(function(err){
      tick.reset()
      clearTimeout(timeout)
      if( timedOut ) return;
      var took = now()-t;
      // allow it to be 15ms off
      if( Math.abs(took-time) > 15 )
        err = new Error('tick is off too much. expected '+time+'ms was '+took+'ms')
      next(err);
    })
  } else {
    // done!
    clearInterval(interval);
  }
}
function now(){
  return typeof performance == 'undefined'
    ? Date.now()
    : performance.now()
}