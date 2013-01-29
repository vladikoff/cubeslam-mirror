var debug = require('debug')('actions:extra')
  , settings = require('../settings')
  , BodyFlags = require('../geom-sim/body-flags')
  , shapes = require('../geom-sim/shapes')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

/**
 *
 * IDs and descriptions of extras:
 *
 *   'paddle resize' (level 1)
 *       big=125%, small=75% (random)
 *
 *   'extra life' (level 2)
 *       on shield gets regenerated
 *
 *   'fog' (level 3)
 *       covers the opponents side of the field
 *       for X seconds
 *
 *   'multiball' (level 4)
 *       split ball up into X balls for Y seconds
 *       (or until it hits a shield/player)
 *       maybe start w. GHOST-flag for 5 frames to
 *       avoid hitting the puck?
 *
 *   'fireball' (level 5)
 *       removes items (other pucks and not
 *       picked up extras) in the way. makes
 *       hit paddle dizzy ()
 *
 *   'ghost ball' (level 6)
 *       ball becomes barely visible for X
 *       seconds (or until it hits a
 *       shield/player), only when it hits something
 *
 *   'bulletproof' (level 7)
 *       a shield partition becomes unbreakable
 *       for X seconds
 *
 *   'mirroring' (level 8)
 *       controls get inverted
 *
 *   'laser' (level 9)
 *       auto shoots a laser that if hit player
 *       paddle shrinks it
 *
 *   'time bomb' (level 10)
 *       ball explodes after X seconds which removes
 *       items and shrinks paddles within Y radius.
 *       puck then restarts from middle.
 *
 *   'random' (level 11)
 *       any of the available extras
 *
 *   'death ball'
 *       bad assery
 *
 **/

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
        actions.regenerateShield(world,player)
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
