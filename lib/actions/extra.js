var debug = require('debug')('actions:extra')
  , settings = require('../settings')
  , BodyFlags = require('../geom-sim/body-flags')
  , shapes = require('../geom-sim/shapes')
  , colliding = require('../collisions').colliding
  , actions = require('./')
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
 *       one shield gets regenerated
 *
 *   'fog' (level 3)
 *       covers the opponents side of the field
 *       for X seconds
 *
 *   'multiball' (level 4)
 *       split ball up into X balls for Y seconds
 *       (or until it hits a shield/player)
 *       maybe start w. GHOST-flag for 5 frames to
 *       avoid instant collision?
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

exports.createRandomExtra = function(world,level){
  debug('create random');
  var extra = rand(world,level.extras.available);
  var positions = shuffle(world,level.extras.positions);
  var pos = positions.pop();
  var body = actions.createExtra(world,extra.id,pos.x,pos.y);

  // this should be ok w. max 3 extras and a few pucks?
  var n;
  var x = pos.x, y = pos.y; // avoid updating the positions objects
  while(colliding(world,body) && (n = positions.pop())){
    poly.translate(body.shape, n.x-x, n.y-y);
    body.aabb = poly.aabb(body.shape) // update aabb
    body.current[0] = body.previous[0] = x = n.x;
    body.current[1] = body.previous[1] = y = n.y;
  }
  if( colliding(world,body) ){
    console.warn('still colliding after all positions, is there enough positions in the level?!')
    console.log('body',body)
    console.log('extra',extra)
  }

  return body;
}

exports.createExtra = function(world, id, x, y){
  debug('create',id);

  switch(id){
    case 'fog':
    case 'fastball':
    case 'extra life':
    case 'multiball':
      var shape = shapes.rect(settings.data.unitSize,settings.data.unitSize);
      var extra = world.createBody(shape, x, y, BodyFlags.STATIC | BodyFlags.DESTROY)
      extra.id = id;
      world.extras.set(extra.index,extra)
      break;
    default:
      throw new Error('invalid extra: '+id)
  }

  return extra;
}


exports.hitExtra = function(world, puck, extra){
  debug('hit %s puck: %s',extra.index,puck.index)

  // remove extra (unlike obstacles, extras are removed)
  actions.destroyExtra(world,extra)

  if( extra.id == 'random' ){
    extra = world.level.extras[0];
  }

  switch(extra.id){

    case 'extra life':
      var player = world.lastHitPucks[puck.index];
      if( player ){
        actions.regenerateShield(world,world.players[player])
      } else {
        console.log('haha noob. you have to hit it with the paddle first...')
        // TODO should it not be "hit" if no player paddle already hit the puck?
      }
      break;

    case 'time bomb':
    case 'bulletproof':
    case 'fireball':
    case 'fog':
      // TODO set the extra.id as key and the extra info from the level as the value
      // TODO perhaps validate the options first
      world.activeExtras.set('fog', {start: world.frame, end: world.frame+600} );
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

exports.destroyExtra = function(world, extra){
  debug('destroy',extra.index);
  world.extras.del(extra.index)
  world.releaseBody(extra)
}

exports.destroyFirstExtra = function(world){
  // find out which is the first extra
  // (i guess the one with the lowest index?)
  var extra
    , index = Infinity;
  for(var i=0; i < world.extras.length; i++){
    var e = world.extras.values[i];
    if( !e.removed && e.index < index ){
      index = e.index;
      extra = e;
    }
  }
  debug('destroy first',index);
  if( extra ){
    console.log('destroy first',index,extra.index,world.extras.values);
    actions.destroyExtra(world, extra)
    world.destroyBody(extra)
  } else
    console.error('no extra found?!');
}


function rand(world,arr){
  return arr[Math.round(world.random()*arr.length-.5)]
}

function shuffle(world,arr){
  var array = arr.concat();
  var tmp, current, top = array.length;

  if(top) while(--top) {
    current = Math.floor(world.random() * (top + 1));
    tmp = array[current];
    array[current] = array[top];
    array[top] = tmp;
  }

  return array;
}