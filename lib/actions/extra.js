var debug = require('debug')('actions:extra')
  , settings = require('../settings')
  , BodyFlags = require('../sim/body-flags')
  , World = require('../world')
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

/**
 * Creates one of the availabe extras at one of the
 * designated positions.
 *
 * @param  {World} world
 * @param  {Object} level
 * @return the created extra
 */
exports.createRandomExtra = function(world,level){
  debug('%s create random',world.name);
  var arr = level.extras.available.concat();

  if( settings.data.overrideSpawnExtras ) {
    arr = settings.getSpawnlist()
  }

  // sort out extras not available in this round
  for (var i = arr.length - 1; i >= 0; i--) {
    if( arr[i].round && arr[i].round > ( world.opponent.score + world.me.score )+1){
      arr.splice(i,1);
    }
  };

  if(arr.length == 0){
    return;
  }

  var extra = rand(world,arr);
  var positions = shuffle(world,level.extras.positions);
  var pos = positions.pop();
  var body = actions.createExtra(world,extra,pos.x,pos.y);

  // this should be ok w. max 3 extras and a few pucks?
  var n;
  var x = pos.x, y = pos.y; // avoid updating the positions objects
  while(colliding(world,body) && (n = positions.pop())){
    poly.translate(body.shape, n.x-x, n.y-y);
    poly.aabb(body.shape, body.aabb) // update aabb
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

/**
 * Creates an extra body "pick-up" in the arena that
 * can be hit by the puck.
 *
 * When hit `hitExtra` will be called.
 *
 * @param  {World} world
 * @param  {Object} data  The extra level data (ex. {id:'fog',duration:200})
 * @param  {Number} x
 * @param  {Number} y
 * @return {Body} the created extra pick-up.
 */
exports.createExtra = function(world, data, x, y){
  debug('%s create',world.name ,data.id);

  if( validExtra(data) ){
    var shape = shapes.rect(settings.data.unitSize,settings.data.unitSize);
    var extra = world.createBody(shape, x, y, BodyFlags.STATIC | BodyFlags.DESTROY)
    extra.id = 'extra';
    extra.data = data;
    world.extras.set(extra.index,extra)
    dmaf.tell( data.id.split(' ').join("_")  + "_spawn");
    actions.emit('showExtra',data.id);

  } else {
    console.log(data.id)
    throw new Error('invalid extra: '+data.id)
    return;
  }

  if( data.id == "death ball") {
    dmaf.tell( "death_ball_activate");
    actions.emit('renderer','toggleDeathball',{active:true})
    world.tick.clearTimeout(world.timeouts.deathballTimeout);
    world.timeouts.deathballTimeout = world.tick.setTimeout(function(){
      actions.emit('renderer','toggleDeathball',{active:false})
    },(data.duration || 5)*1000);

  }

  return extra;
}

/**
 * Called when an extra pick-up has been hit by
 * the puck.
 *
 * @param  {World} world
 * @param  {Body} puck
 * @param  {Body} extra
 */
exports.hitExtra = function(world, puck, extra){
  debug('%s hit %s puck: %s',world.name ,extra.index,puck.index)

  this.emit('renderer','activateExtra',{puck:puck, extra: extra})

  // remove extra (unlike obstacles, extras are removed)
  actions.destroyExtra(world,extra)

  var id = extra.data.id
    , data = extra.data;

  // if extra is 'on fire' only destroy the extra
  if( puck.data.fireball ){
    actions.emit('removeExtra',puck.data.fireball.id);
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

  dmaf.tell( id.split(' ').join("_")  + "_activate");
  actions.emit('activateExtra',id);

  switch(id){

    case 'extra life':
      var player = world.lastHitPucks[puck.index];
      if( player ){
        actions.regenerateShield(world,world.players[player])
        actions.emit('removeExtra',id);
      } else {
        console.log('haha noob. you have to hit it with the paddle (or shield) first...')
        // TODO should it not be "hit" if no player paddle already hit the puck?
      }
      break;

    case 'ghost ball':
      // turn ghost effect on
      // TODO make it go away after X seconds?
      puck.data.ghostball = 1;
      actions.emit('removeExtra',id);
      break;

    case 'fireball':
      var player = world.lastHitPucks[puck.index];
      if( player ){
        // mark the paddle as fireball
        // to be transferred when a puck hits it
        var paddle = world.paddles.get(world.players[player].paddle);
        paddle.data.fireball = 1;
        actions.emit('removeExtra',id);
      } else {
        console.log('haha noob. you have to hit it with the paddle (or shield) first...')
        // TODO should it not be "hit" if no player paddle already hit the puck?
      }
      break;

    case 'mirrored controls':
      // mirror the controls
      actions.emit('renderer','mirrorEffect',{active: true})

     /* world.tick.clearTimeout(world.timeouts.mirrorTimeout);
      world.timeouts.mirrorTimeout = world.tick.setTimeout(function(){
        dmaf.tell("mirrored_controls_over");
        actions.emit('renderer','mirrorEffect',{active: false})
        actions.emit('removeExtra',id);
      },(data.duration || 1)*1000)*/
      break;

    case 'bulletproof':
      var playerID = world.lastHitPucks[puck.index]
        , player = world.players[playerID];

      if( player ){
        // find available shields
        for(var i=0; i<world.shields.length; i++){
          var shield = world.shields.values[i];
          if( shield.data.player === playerID
          && player.shields[shield.data.index] !== 0
          && !shield.data.bulletproof ){
            shield.data.bulletproof = 1;

            // reset after the duration
            // TODO we should probably use a single timeout
            //      for these. unless we want some "stair effect"
            //console.log('making shield bullet proof',shield.index)
            world.tick.setTimeout(function(shield){
              //console.log('no more bullet proof',shield.index)
              if( !shield.removed ){
                shield.data.bulletproof = 0;
                actions.emit('removeExtra',id);
              }
            }.bind(null,shield),(data.duration || 4)*1000)
          }
        }
      } else {
        console.log('no player to make bullet proof')
      }
      break;

    case 'paddle resize':
      var playerID = world.lastHitPucks[puck.index]
        , player = world.players[playerID]
        , paddle = world.paddles.get(player.paddle);

      // large or small?
      var scale = world.random() > .5 ? 1.25 : 0.75;
      actions.resizePaddle(world,paddle,scale);

      actions.emit('renderer','paddleResize',{playerID:playerID,player:player, paddle: paddle})

      // timeout after 10s (or data.duration)
      // and scale back to normal
      world.tick.clearTimeout(paddle.data.resizeTimeout);
      paddle.data.resizeTimeout = world.tick.setTimeout(function(){
        actions.resizePaddle(world,paddle,1);
        actions.emit('removeExtra',id);
      },(data.duration || 10)*1000)
      break;

    case 'death ball':
      world.tick.nextFrame(function(){
        // TODO let someone know player lost?
        // var playerID = world.lastHitPucks[puck.index]
        //   , player = world.players[playerID]
        dmaf.tell( "death_ball_over");
        world.setState(World.DEATH_BALL);
        actions.emit('round over',world)
      });
      break;

    case 'time bomb':
      puck.data.timebomb = 1;

      world.tick.clearTimeout(puck.data.bombTimeout);
      puck.data.bombTimeout = world.tick.setTimeout(function(puck,radius){
        puck.data.timebomb = 2; // boom!
        actions.emit('removeExtra',id);

        // query which shields are within radius
        // and destroy them!
        var radSq = radius*radius
          , destroyed = [];
        for(var i=0; i<world.shields.length;i++){
          var shield = world.shields.values[i];
          var distSq = vec.distSq(puck.current,shield.current)
          if( distSq < radSq ){
            // no good to destroy within loop because
            // stashes are unordered
            destroyed.push(shield);
          }
        }
        while( destroyed.length ){
          actions.destroyShield(world,destroyed.pop());
        }
      }.bind(null,puck,data.radius || settings.data.arenaHeight / 2),(data.time || 10)*1000)
      break;

    case 'laser':
      var playerID = world.lastHitPucks[puck.index]
        , player = world.players[playerID]
        , paddle = world.paddles.get(player.paddle);

      // TODO should we only allow one laser paddle?
      //      if so store the interval/timeout ids on
      //      the extra instead.

      // mark it as a laser paddle
      paddle.data.laser = 1;

      // shoot bullets at an interval
      world.tick.clearInterval(paddle.data.laserInterval)
      paddle.data.laserInterval = world.tick.setInterval(function(paddle){
        actions.createBullet(world,paddle);
      }.bind(null,paddle), 1000) // TODO data.interval?

      // end the destructive maybe after a while
      world.tick.clearTimeout(paddle.data.laserTimeout)
      paddle.data.laserTimeout = world.tick.setTimeout(function(paddle){
        dmaf.tell( "laser_over");
        world.tick.clearInterval(paddle.data.laserInterval)
        paddle.data.laser = 2;
      }.bind(null,paddle), 10000) // TODO data.duration?
      break;

    case 'fog':
      this.emit('renderer','toggleFog',{active:true})

      world.tick.clearTimeout(world.timeouts.fogTimeout);
      world.timeouts.fogTimeout = world.tick.setTimeout(function(){
        actions.emit('renderer','toggleFog',{active:false})
        dmaf.tell( "fog_over");
        actions.emit('removeExtra',id);
      },(data.duration || 5)*1000)

      break;

    case 'multiball':

      // create a new puck
      var x = data.x || settings.data.arenaWidth / 2
        , y = data.y || settings.data.arenaHeight / 2
        , n = actions.createPuck(world,x,y,puck.mass);

      // copy the last hit
      world.lastHitPucks[n.index] = world.lastHitPucks[puck.index];

      // make the new puck a ghost for a few frames
      // to avoid collisions
      // TODO base time on velocity?
      BodyFlags.add(n,BodyFlags.GHOST);
      world.tick.setTimeout(function disableGhost(){
        // if it's colliding when GHOST wears off
        // wait a try again next frame
        if( colliding(world,n) ){
          console.log('puck was colliding when GHOST wore off. trying again next frame.')
          return world.tick.nextFrame(disableGhost);
        }
        BodyFlags.del(n,BodyFlags.GHOST)
        actions.emit('removeExtra',id);
      },200) // 200ms or 12 frames @ 60fps

      // push the new puck in one direction and the old one
      // in the opposite.
      var speed = puck.velocity[1] < 0
                ?  settings.data.unitSpeed
                : -settings.data.unitSpeed;
      actions.puckSpeedXY(world, n, 0, speed)
      break;
  }
}

exports.destroyExtra = function(world, extra){
  debug('%s destroy',world.name ,extra.index);
  world.extras.del(extra.index)
  world.releaseBody(extra)
  actions.emit('removed','extra',world,extra);
  dmaf.tell( extra.data.id.split(' ').join("_")  + "_removed");
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
    actions.emit('removeExtra',extra.data.id);
    actions.destroyExtra(world, extra)
    world.destroyBody(extra)
  } else {
    console.error('no extra found?!');
  }
}

function validExtra(data){
  // TODO validate the options
  switch(data.id){
    case 'fog':
    case 'fireball':
    case 'ghost ball':
    case 'extra life':
    case 'multiball':
    case 'bulletproof':
    case 'mirrored controls':
    case 'death ball':
    case 'paddle resize':
    case 'time bomb':
    case 'laser':
    case 'random':
      return true;
  }
  return false;
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