var debug = require('debug')('actions:bullet')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , Body = require('../geom-sim/body')
  , shapes = require('../geom-sim/shapes')
  , settings = require('../settings');


// id is a generated id (ex 'a1' = player + (last shot id + 1))
// x, y is position it should start at
// v is the speed it should be moving with
exports.bulletCreate = function(world,x,y,v){
  debug('create',x,y,v)

  // define a shape of the shot
  var shape = shapes.rect(settings.data.unitSize,150); // as in environment

  // create a shot body
  var body = world.createBody(shape,+x,+y, Body.DYNAMIC | Body.DESTROY);

  // push it in the right direction (based on `v`)
  var vel = vec.make(0,+v)
  vec.add(body.current,vel,body.previous)
  vec.free(vel)

  // save it for rendering and physics
  world.bullets.set(body.index,body)
}

exports.bulletDestroy = function(world, bullet){
  debug('destroy',bullet.index)
  world.bullets.del(bullet.index)
  world.releaseBody(bullet)
}