var debug = require('debug')('actions:bullet')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , BodyFlags = require('../sim/body-flags')
  , shapes = require('../sim/shapes')
  , settings = require('../settings')
  , actions = require('../actions')
  , dmaf = require('../dmaf.min');


// id is a generated id (ex 'a1' = player + (last shot id + 1))
// x, y is position it should start at
// v is the speed it should be moving with
exports.createBullet = function(world,paddle){
  debug('%s create',world.name ,paddle)

  var forward = paddle.index === world.players.b.paddle;

  var c = paddle.current
    , s = settings.data.unitSpeed * settings.data.bulletSpeed
    , v = vec.make(0, forward ? -s : s);

  // define a shape of the shot
  var bulletWidth = settings.data.unitSize;
  var bulletHeight = 150;
  var shape = shapes.rect(bulletWidth,bulletHeight);


  // round x to unitSize
  var paddleCenter = c[0] + bulletWidth*0.5 // no this would be the paddle edge?
  var spawnX = Math.floor(paddleCenter/bulletWidth)*bulletWidth-bulletWidth*0.5;

  // create a shot body
  var paddleHeight = paddle.aabb[2] - paddle.aabb[0];
  var spawnY = c[1] + s + (paddleHeight + bulletHeight)*(forward ? 1 : -1);

  var body = world.createBody(shape,spawnX,spawnY, BodyFlags.DYNAMIC | BodyFlags.DESTROY);
  body.id = 'bullet';

  // push it in the right direction (based on `v`)
  vec.add(body.current,v,body.previous)
  vec.free(v)

  // save it for rendering and physics
  world.bullets.set(body.index,body)
  actions.emit('added','bullet',world,body);
}

exports.hitBulletObstacle = function(world, bullet, obstacle){
  debug('%s hit obstacle', world.name, bullet.index, obstacle.index)

  actions.destroyBullet(world,bullet);
}

exports.hitBulletPaddle = function(world, bullet, paddle){
  debug('%s hit paddle', world.name, bullet.index, paddle.index)

  // destroy the bullet
  actions.destroyBullet(world,bullet);

  dmaf.tell( (paddle.index == world.me.paddle?'user':'opponent')+ '_paddle_shrink')

  // shrink paddle to half the size
  actions.resizePaddle(world, paddle.index, 0.5);

  // timeout after 5s and scale back to normal
  world.tick.clearTimeout(paddle.data.resizeTimeout);
  paddle.data.resizeTimeout = world.tick.setTimeout('resizePaddle',5000,paddle.index,1)
}

exports.destroyBullet = function(world, body){
  debug('%s destroy',world.name ,body.index)
  world.bullets.del(body.index)
  world.releaseBody(body)
  actions.emit('removed','bullet',world,body);
}