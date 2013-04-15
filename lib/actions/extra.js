var debug = require('debug')('actions:extra')
  , settings = require('../settings')
  , BodyFlags = require('../sim/body-flags')
  , World = require('../world')
  , shapes = require('../sim/shapes')
  , colliding = require('../sim/collisions').colliding
  , actions = require('./')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , dmaf = require('../dmaf.min');

/**
 *
 * IDs and descriptions of extras:
 *
 *   'paddleresize' (level 1)
 *       big=125%, small=75% (random)
 *
 *   'extralife' (level 2)
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
 *   'ghostball' (level 6)
 *       ball becomes barely visible for X
 *       seconds (or until it hits a
 *       shield/player), only when it hits something
 *
 *   'bulletproof' (level 7)
 *       a shield partition becomes unbreakable
 *       for X seconds
 *
 *   'mirroredcontrols' (level 8)
 *       controls get inverted
 *
 *   'laser' (level 9)
 *       auto shoots a laser that if hit player
 *       paddle shrinks it
 *
 *   'timebomb' (level 10)
 *       ball explodes after X seconds which removes
 *       items and shrinks paddles within Y radius.
 *       puck then restarts from middle.
 *
 *   'random' (level 11)
 *       any of the available extras
 *
 *   'deathball'
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
exports.createRandomExtra = function(world){
  debug('%s create random',world.name);
  var src = settings.data.overrideSpawnExtras
          ? settings.getSpawnlist()
          : world.level.extras;

  // filter out extras which should not be available
  // in this round.
  var round = world.players.a.score + world.players.b.score + 1;
  var arr = src.filter(function(e){
    return !e.round || e.round <= round;
  })

  // no extras found to match this round
  if( !arr.length ){
    return;
  }

 // if( world.extras.values.length >= world.level.simultaneousExtras)
 //   return;

  // find an extra based on probability
  var extra = prob(world,arr);
  var positions = shuffle(world,world.level.positions);
  var pos = extra.position || positions.pop();
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
    dmaf.tell( data.id + "_spawn");

    //map to dmaf-name, change later

    actions.emit('showExtra',data.id,extra);

  } else {

    throw new Error('invalid extra: '+data.id)
    return;
  }

  if( data.id == "deathball") {
    actions.gameToggleDeathball(world,true)
    world.tick.clearTimeout(world.timeouts.deathballTimeout);
    world.timeouts.deathballTimeout = world.tick.setTimeout('gameToggleDeathball',(data.duration || 5)*1000,false);
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
    actions.emit('removeExtra',puck.data.fireball.id, extra);
    return;
  }

  // random extra
  if( id == 'random' ){
    // "random" has no actual effect, remove it from available
    var available = world.level.extras.filter(function(e){return e.id !== 'random'})
    data = rand(world,available);
    if( !data ){
      console.warn('no extra found to use as random')
      return
    }
    id = data.id;
  }

  dmaf.tell( id + "_activate");
  actions.emit('activateExtra',id, extra);

  switch(id){

    case 'extralife':

      var player = world.lastHitPucks[puck.index];
      if( player ){
        actions.regenerateShield(world,world.players[player])
        actions.emit('removeExtra',id,extra);
      } else {
        console.log('haha noob. you have to hit it with the paddle (or shield) first...')
        // TODO should it not be "hit" if no player paddle already hit the puck?
      }
      break;

    case 'ghostball':
      var duration = (data.duration || 7)*1000;
      actions.puckToggleGhostball(world,puck.index)
      world.tick.clearTimeout(puck.data.ghostballTimeout);
      puck.data.ghostballTimeout = world.tick.setTimeout('puckToggleGhostball', duration, puck.index)
      break;

    case 'fireball':
      var playerID = world.lastHitPucks[puck.index]
        , player = world.players[playerID];
      if( player ){
        // mark the paddle as fireball
        // to be transferred when a puck hits it
        var paddle = world.paddles.get(player.paddle);
        paddle.data.fireball = 1;
        actions.emit('removeExtra',id,extra);
      } else {
        console.log('haha noob. you have to hit it with the paddle (or shield) first...')
        // TODO should it not be "hit" if no player paddle already hit the puck?
      }
      break;

    case 'mirroredcontrols':
      // mirror the controls
      actions.emit('renderer','mirrorEffect',{active: true})
      break;

    case 'bulletproof':
      var playerID = world.lastHitPucks[puck.index]
        , player = world.players[playerID]
        , duration = (data.duration || 7) * 1000;

      if( player ){
        actions.playerToggleBulletproof(world,playerID,true);
        world.tick.clearTimeout(world.timeouts.bulletproof);
        world.timeouts.bulletproof = world.tick.setTimeout('playerToggleBulletproof', duration, playerID, false)
      } else {
        console.log('no player to make bullet proof')
      }
      break;

    case 'paddleresize':
      var playerID = world.lastHitPucks[puck.index]
        , player = world.players[playerID]
        , paddle = world.paddles.get(player.paddle)
        , duration = (data.duration || 10) * 1000;

      actions.playerTogglePaddleResize(world,playerID,true)

      world.tick.clearTimeout(paddle.data.resizeTimeout);
      paddle.data.resizeTimeout = world.tick.setTimeout('playerTogglePaddleResize',duration, playerID, false);
      break;

    case 'deathball':
      world.tick.nextFrame('gameDeathballOver',puck.index);
      break;

    case 'timebomb':
      var radius = data.radius || settings.data.arenaHeight / 2;
      puck.data.timebomb = 1;
      world.tick.clearTimeout(puck.data.bombTimeout);
      puck.data.bombTimeout = world.tick.setTimeout('puckTimebombExplode', 4000, puck.index, radius)
      break;

    case 'laser':
      var playerID = world.lastHitPucks[puck.index]
        , player = world.players[playerID]
        , paddle = world.paddles.get(player.paddle)
        , duration = (data.duration || 5)*1000;

      // only one laser at the time
      if( world.timeouts.laserTimeout ) {
        dmaf.tell( "laser_over");
        // TODO don't use Stash#values like this.
        if( world.paddles.values[0].data.laser == 1 ){
          world.paddles.values[0].data.laser = 2;
        } else if( world.paddles.values[1].data.laser == 1 ) {
          world.paddles.values[1].data.laser = 2;
        }
      }

      actions.playerToggleLaser(world,playerID,true)
      world.tick.clearTimeout(world.timeouts.laserTimeout)
      world.timeouts.laserTimeout = world.tick.setTimeout('playerToggleLaser',duration,playerID,false);
      break;

    case 'fog':
      var duration = (data.duration || 5)*1000;
      actions.gameToggleFog(world,true)
      world.tick.clearTimeout(world.timeouts.fog);
      world.timeouts.fog = world.tick.setTimeout('gameToggleFog',duration,false)
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
      actions.puckToggleGhostFlag(world,n.index,true)
      world.tick.clearTimeout(puck.data.ghostTimeout);
      puck.data.ghostTimeout = world.tick.setTimeout('puckToggleGhostFlag',200,n.index,false)

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

  dmaf.tell( extra.data.id + "_remove");

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
    actions.emit('removeExtra',extra.data.id,extra);
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
    case 'ghostball':
    case 'extralife':
    case 'multiball':
    case 'bulletproof':
    case 'mirroredcontrols':
    case 'deathball':
    case 'paddleresize':
    case 'timebomb':
    case 'laser':
    case 'random':
      return true;
  }
  return false;
}

function prob(world,available){
  var d = settings.data.defaultProbability
    , t = available.reduce(function(t,e){return t+(e.probability || d)},0)
    , x = world.random() * t
    , p = 0;
  for(var i=0;i<available.length; i++){
    var e = available[i]
      , n = p + (e.probability || d);
    if( x >= p && x < n ){
      return e;
    }
    p = n;
  }
  throw new Error('no extra found. whut?')
  return null;
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