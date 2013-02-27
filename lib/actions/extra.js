var debug = require('debug')('actions:extra')
  , settings = require('../settings')
  , BodyFlags = require('../sim/body-flags')
  , shapes = require('../sim/shapes')
  , colliding = require('../sim/collisions').colliding
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
  debug('%s create random',world.name);
  var arr = level.extras.available;

  if( settings.data.overrideSpawnExtras ) {
    arr = settings.getSpawnlist()
  }

  if(arr.length == 0) return;

  var extra = rand(world,arr);
  var positions = shuffle(world,level.extras.positions);
  var pos = positions.pop();
  var body = actions.createExtra(world,extra,pos.x,pos.y);

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
  actions.emit('added','extra',world,body);
  return body;
}

exports.createExtra = function(world, data, x, y){
  debug('%s create',world.name ,data.id);

  dmaf.tell( data.id.split(' ').join("_")  + "_spawn");

  switch(data.id){
    case 'fog':
    case 'fireball':
    case 'ghost ball':
    case 'extra life':
    case 'multiball':
    case 'bulletproof':
    case 'mirrored controls':
    case 'death ball':
    case 'random':
      var shape = shapes.rect(settings.data.unitSize,settings.data.unitSize);
      var extra = world.createBody(shape, x, y, BodyFlags.STATIC | BodyFlags.DESTROY)
      extra.id = 'extra';
      extra.data = data;
      world.extras.set(extra.index,extra)
      break;
    default:
    console.log(data.id)
      throw new Error('invalid extra: '+data.id)
  }

  return extra;
}


exports.hitExtra = function(world, puck, extra){
  debug('%s hit %s puck: %s',world.name ,extra.index,puck.index)

  // remove extra (unlike obstacles, extras are removed)
  actions.destroyExtra(world,extra)

  var id = extra.data.id
    , data = extra.data;

  dmaf.tell( id.split(' ').join("_")  + "_activate");

  // if extra is 'on fire' only destroy the extra
  if( puck.data.fireball ){
    return;
  }

  // random extra
  if( id == 'random' ){
    // "random" has no actual effect, remove it from available
    var available = world.level.extras.available.filter(function(e){return e.id !== 'random'})
    data = rand(world,available);
    if( !data ){
      console.warn('no extra found to use as random')
      return
    }
    id = data.id;
  }


  switch(id){

    case 'extra life':
      var player = world.lastHitPucks[puck.index];
      if( player ){
        actions.regenerateShield(world,world.players[player])
      } else {
        console.log('haha noob. you have to hit it with the paddle (or shield) first...')
        // TODO should it not be "hit" if no player paddle already hit the puck?
      }
      break;

    case 'ghost ball':
      // turn ghost effect on
      // TODO make it go away after X seconds?
      puck.data.ghostball = 1;
      break;

    case 'fireball':
      var player = world.lastHitPucks[puck.index];
      if( player ){
        // mark the paddle as fireball
        // to be transferred when a puck hits it
        var paddle = world.paddles.get(world.players[player].paddle);
        paddle.data.fireball = 1;
      } else {
        console.log('haha noob. you have to hit it with the paddle (or shield) first...')
        // TODO should it not be "hit" if no player paddle already hit the puck?
      }
      break;

    case 'mirrored controls':
      var playerID = world.lastHitPucks[puck.index]
        , player = world.players[playerID];

      // only affected if player is me
      if( player === world.me ){
        var paddle = world.paddles.get(player.paddle);

        // reset mirrored paddle timeout in case it was previously mirrored
        world.tick.clearTimeout(paddle.data.mirrored);

        // mirror the controls
        actions.emit('renderer','mirrorEffect',{active: true})
        paddle.data.mirrored = world.tick.setTimeout(function(){
          actions.emit('renderer','mirrorEffect',{active: false})
        },(data.duration || 1)*1000)
      }
      break;

    case 'bulletproof':
      var playerID = world.lastHitPucks[puck.index]
        , player = world.players[playerID];

      if( player ){
        // find available shields
        //var shields = [];
        for(var i=0; i<world.shields.length; i++){
          var s = world.shields.values[i];
          if( s.data.player === playerID
          && player.shields[s.data.index] !== 0
          && !s.data.bulletproof ){
            //shields.push(s);

             // pick a random one and set it to bulletproof
            var shield = s;
            shield.data.bulletproof = 1;
            //console.log('making shield bullet proof',shield.index)

            // reset after the duration
            world.tick.setTimeout(function(shield){
              //console.log('no more bullet proof',shield.index)
              if( !shield.removed )
                shield.data.bulletproof = 0;
            }.bind(null,shield),(data.duration || 4)*1000)
          }
        }
      } else {
        console.log('no player to make bullet proof')
      }
      break;

    case 'death ball':
    case 'time bomb':
    case 'laser':
      // TODO
      break;

    case 'fog':
      var playerID = world.lastHitPucks[puck.index]
        , player = world.players[playerID]
        , paddle = world.paddles.get(player.paddle);

      paddle.data.fog = 1;
      world.tick.clearTimeout(paddle.data.fogTimeout);
      paddle.data.fogTimeout = world.tick.setTimeout(function(){
        paddle.data.fog = 0;
        dmaf.tell( "fog_over");
      },(data.duration || 5)*1000)

      break;

    case 'multiball':
      // create a new puck
      var n = actions.puckCreate(world,puck.previous[0],puck.previous[1],puck.mass,BodyFlags.DYNAMIC | BodyFlags.BOUNCE | BodyFlags.GHOST)

      world.lastHitPucks[n.id] = world.lastHitPucks[puck.id];

      // make the new puck a ghost for a few frames
      // to avoid collisions
      world.tick.setTimeout(function(){
        BodyFlags.del(n,BodyFlags.GHOST)
      },200) // 200ms = 6 or 12 frames

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
  debug('%s destroy',world.name ,extra.index);
  world.extras.del(extra.index)
  world.releaseBody(extra)
  actions.emit('removed','extra',world,extra);
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
  debug('%s destroy first',world.name ,index);
  if( extra ){
    // console.log('destroy first',index,extra.index,world.extras.values);
    actions.destroyExtra(world, extra)
    world.destroyBody(extra)
  } else {
    console.error('no extra found?!');
  }
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