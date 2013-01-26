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
exports.createBullet = function(world,speed){
  debug('create',speed)

  var p = world.paddles.get(world.me.paddle)
    , c = p.current;

  // TODO do the same as in createBullet below...

  // define a shape of the shot
  var shape = shapes.rect(settings.data.unitSize,150); // as in environment

  // create a shot body
  var body = world.createBody(shape,c[0],c[1], BodyFlags.DYNAMIC | BodyFlags.DESTROY);

  // push it in the right direction (based on `v`)
  var vel = vec.make(0,speed)
  vec.add(body.current,vel,body.previous)
  vec.free(vel)

  // save it for rendering and physics
  world.bullets.set(body.index,body)
}


function createBullet(world,actions){
  // TODO move this into actions
  // generate an id, x, y and v
  var id = Body.getNextIndex()
    , c = world.paddles.get(world.me.paddle).current
    , v = world.me.paddle == 0 ? 30 : -30
    , columsWidth = settings.data.arenaWidth/settings.data.arenaColumns
    , x = Math.floor(c[0]/columsWidth)*columsWidth + columsWidth*.5;
  actions.bulletCreate(world,x,c[1]-v*10,v);
}


exports.destroyBullet = function(world, bullet){
  debug('destroy',bullet.index)
  world.bullets.del(bullet.index)
  world.releaseBody(bullet)
}