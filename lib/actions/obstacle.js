var debug = require('debug')('actions:obstacle')
  , settings = require('../settings')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , Extras = require('../extras')
  , Body = require('../geom-sim/body');

exports.obstacleCreate = function(world,id,x,y){
  debug('obstacle create',id,x,y);
  var extra = Extras[id];

  // only add one of each at a time
  if( extra && !world.obstacles.has(id) ){
    // move it in place
    var p = vec.make(+x,+y)
    vec.copy(p,extra.current)
    vec.copy(p,extra.previous)
    vec.free(p)

    // set obstacle flags
    extra.setFlags(Body.STATIC | Body.BOUNCE);

    world.obstacles.set(id,extra)
    world.bodies.set(id,extra)
    world.added.push(extra);
  }
}

exports.obstacleDestroy = function(world,id){
  var extra = world.obstacles.get(id)
  if( extra ){
    world.obstacles.del(id)
    world.bodies.del(id)
    world.removed.push(extra)
  }
}
