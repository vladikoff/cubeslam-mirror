var debug = require('debug')('actions:bullet')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , Body = require('../geom-sim/body')
  , shapes = require('../geom-sim/shapes')
  , settings = require('../settings');


// id is a generated id (ex 'a1' = player + (last shot id + 1))
// x, y is position it should start at
// v is the speed (and direction) it should be moving with (see puckSpeed)
exports.bulletCreate = function(world,id,x,y,v){
  debug('create',id,x,y,v)

  // make sure it doesn't already exist
  if( world.bullets.has(id) )
    return console.warn('bullet with id "%s" already exists',id);

  // define a shape of the shot (i'm thinking long and thin..)
  var w = settings.data.arenaWidth/settings.data.arenaColumns;
  var shape = shapes.rect(w,150); // as in environment

  // create a shot body
  var shot = new Body(shape,+x,+y, Body.DYNAMIC | Body.DESTROY);
  shot.id = id;

  var actions = this;

  // TODO destroy the obstacle/extra it hits
  shot.oncollision = function(q,c){
    debug('oncollision',id)
    actions.bulletDestroy(id);
  }

  shot.onbounds = function(b){
    debug('onbounds',id)
    actions.bulletDestroy(id);
  }

  // push it in the right direction (based on `v`)
  var vel = vec.make(0,+v)
  vec.add(shot.current,vel,shot.previous)
  vec.free(vel)

  // save it for rendering and physics
  world.bullets.set(id,shot)
  world.bodies.set(id,shot)
  world.added.push(shot);
}

exports.bulletDestroy = function(world, id){
  debug('destroy',id)

  var extra = world.bullets.get(id)
  if( extra ){
    world.bullets.del(id)
    world.bodies.del(id)
    world.removed.push(extra)
  }
}