var debug = require('debug')('actions:extra')
  , settings = require('../settings')
  , BodyFlags = require('../geom-sim/body-flags')
  , shapes = require('../geom-sim/shapes')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

exports.extraCreate = function(world, id, x, y){
  debug('create',id);

  switch(id){
    case 'fog':
    case 'fastball':
    case 'extralife':
    case 'multiball':
      var shape = shapes.rect(settings.data.unitSize,settings.data.unitSize);
      var extra = world.createBody(shape, x, y, BodyFlags.STATIC | BodyFlags.DESTROY)
      extra.id = id;
      world.extras.set(extra.index,extra)
      break;
    default:
      throw new Error('invalid extra: '+id)
  }
}


exports.extraHit = function(world, puck, extra){
  debug('hit %s puck: %s',extra.index,puck.index)

  var actions = this;

  switch(extra.id){

    case 'extralife':
      var player = world.lastHitPucks[puck.index];
      if( player ) {
        actions.emit('renderer','heal',{player: player})
        world.players[player].score = 0;
      } else {
        console.log('haha noob. you have to hit it with the paddle first...')
        // TODO should it not be "hit" if no player paddle already hit the puck?
      }
      break;

    case 'fog':
      world.activeExtras.set('fog', {start: world.frame, end: world.frame+600} );
      break;

    case 'fastball':
      console.log('TODO SPEED UP!')
      break;

    case 'multiball':
      // create a new puck a bit behind the
      // old puck to avoid collisions
      var dir = vec.norm(puck.velocity)
        , len = vec.len(puck.velocity)
      vec.smul(dir,len*10,dir)
      vec.sub(puck.previous,dir,dir)

      var n = actions.puckCreate(world,dir[0],dir[1],puck.mass)
      vec.free(dir)

      // then push both pucks in 45° offsets
      var a = vec.rot(puck.velocity, Math.PI/4) // v + 45°
      var b = vec.rot(puck.velocity,-Math.PI/4) // v - 45°
      actions.puckSpeedXY(world,n,a[0],a[1])
      actions.puckSpeedXY(world,puck,b[0],b[1])
      vec.free(a)
      vec.free(b)
      break;
  }
}

exports.extraDestroy = function(world, extra){
  debug('destroy',extra.index);
  world.extras.del(extra.index)
  world.releaseBody(extra)
}
