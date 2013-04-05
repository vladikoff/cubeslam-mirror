var debug = require('debug')('actions:bullet')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , BodyFlags = require('../sim/body-flags')
  , shapes = require('../sim/shapes')
  , settings = require('../settings')
  , actions = require('../actions');


// id is a generated id (ex 'a1' = player + (last shot id + 1))
// x, y is position it should start at
// v is the speed it should be moving with
exports.createBullet = function(world,paddle){
  debug('%s create',world.name ,paddle)

  var c = paddle.current
    , v = vec.make(0, c[1] > settings.data.arenaHeight*.5 ? 30 : -30);

  // define a shape of the shot
  var size = settings.data.unitSize;
  var shape = shapes.rect(size,150); // as in environment

  var paddleWidth = paddle.aabb[2] - paddle.aabb[0];

  // round x to unitSize
  var paddleCenter = c[0] + paddleWidth*.5 // no this would be the paddle edge?
  var spawnX = Math.floor(paddleCenter/size)*size-size*.5

  // create a shot body
  var body = world.createBody(shape,spawnX,c[1]-v[1]*10, BodyFlags.DYNAMIC | BodyFlags.DESTROY | BodyFlags.GHOST);
  body.id = 'bullet';

  // push it in the right direction (based on `v`)
  vec.add(body.current,v,body.previous)
  vec.free(v)

  // save it for rendering and physics
  world.bullets.set(body.index,body)
  actions.emit('added','bullet',world,body);
}

exports.hitBullet = function(world, bullet, body){
  debug('%s destroy',world.name ,bullet.index, body.index)

  // destroy the bullet
  actions.destroyBullet(world,bullet);

  if( body.id == 'paddle' ){
    console.log('bullet hit paddle! paddle should shrink for 5s!');
    actions.resizePaddle(world, body, .5);

    // timeout after 5s and scale back to normal
    world.tick.clearTimeout(body.data.resizeTimeout);
    body.data.resizeTimeout = world.tick.setTimeout(function(){
      actions.resizePaddle(world,body,1);
    },5000)
  }
}

exports.destroyBullet = function(world, body){
  debug('%s destroy',world.name ,body.index)
  world.bullets.del(body.index)
  world.releaseBody(body)
  actions.emit('removed','bullet',world,body);
}