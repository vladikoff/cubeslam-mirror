var debug = require('debug')('actions:bullet')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , BodyFlags = require('../geom-sim/body-flags')
  , shapes = require('../geom-sim/shapes')
  , settings = require('../settings');


// id is a generated id (ex 'a1' = player + (last shot id + 1))
// x, y is position it should start at
// v is the speed it should be moving with
exports.createBullet = function(world,paddle){
  debug('create',paddle)

  var p = world.paddles.get(paddle)
    , c = p.current
    , v = vec.make(0,paddle == world.me.paddle ? 30 : -30); // TODO might the the other way around...

  // TODO round x to unitSize

  // define a shape of the shot
  var shape = shapes.rect(settings.data.unitSize,150); // as in environment
  
  var paddleWidth = p.aabb[2] - p.aabb[0];
  
  var paddleCenter = c[0] + paddleWidth*.5
  var spawnX = Math.floor(paddleCenter/settings.data.unitSize)*settings.data.unitSize-settings.data.unitSize*.5

  // create a shot body
  var body = world.createBody(shape,spawnX,c[1]-v[1]*10, BodyFlags.DYNAMIC | BodyFlags.DESTROY);
  body.id = 'bullet';

  // push it in the right direction (based on `v`)
  vec.add(body.current,v,body.previous)
  vec.free(v)

  // save it for rendering and physics
  world.bullets.set(body.index,body)
}

exports.destroyBullet = function(world, bullet){
  debug('destroy',bullet.index)
  world.bullets.del(bullet.index)
  world.releaseBody(bullet)
}