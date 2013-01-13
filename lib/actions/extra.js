var debug = require('debug')('actions:extra')
  , settings = require('../settings')
  , Body = require('../geom-sim/body')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , Extras = require('../extras');

exports.extraHit = function(world, extraId,puckId){
  debug('extra hit',extraId,puckId)
  var p = world.pucks.get(puckId);
  switch(extraId){

    case 'extralife':
      var player = world.lastHitPucks[puckId];
      if( player ) {
        world.renderer.triggerEvent("heal", {player: player});
        world.players[player].score = 0;
      }
      else console.log('haha noob. you have to hit it with the paddle first...')
      // TODO should it not be "hit" if no player paddle already hit the puck?
      break;

    case 'fog':
      //TODO: make a proper active-extras-list with objects, add timeout functionality
      //possible and then remove from status list.
      //Objects in this array can by objects with properties id, copy, created, timeout?
      world.activeExtras.set('fog', {start: world.frame, end: world.frame+600} );
      break;

    case 'fastball':
      console.log('TODO SPEED UP!')
      break;

    case 'multiball':
      // create a new puck a bit behind the
      // old puck to avoid collisions
      var dir = vec.norm(p.velocity)
        , len = vec.len(p.velocity)
      vec.smul(dir,len*10,dir)
      vec.sub(p.previous,dir,dir)

      var id = 'p:' + world.puckIndex++;
      exports.puckCreate(id,dir[0],dir[1],p.mass)
      vec.free(dir)

      // then push both pucks in 45° offsets
      var a = vec.rot(p.velocity, Math.PI/4) // v + 45°
      var b = vec.rot(p.velocity,-Math.PI/4) // v - 45°
      exports.puckSpeed(id,a[0],a[1])
      exports.puckSpeed(p.id,b[0],b[1])
      vec.free(a)
      vec.free(b)
      break;
  }
}


exports.extraCreate = function(world, id,x,y){
  debug('extra create',id);
  var extra = Extras[id];

  // only add one of each at a time
  if( extra && !world.extras.get(id) ){
    // move it in place
    var p = vec.make(+x,+y)
    vec.copy(p,extra.current)
    vec.copy(p,extra.previous)
    vec.free(p)

    // set extras flags
    extra.flags = Body.STATIC | Body.DESTROY;

    world.extras.set(id,extra)
    world.bodies.set(id,extra)
    world.added.push(extra);
  }
}

exports.extraDestroy = function(world, id){
  var extra = world.extras.get(id)
  if( extra ){
    world.extras.del(id)
    world.bodies.del(id)
    world.removed.push(extra)
  }
}
