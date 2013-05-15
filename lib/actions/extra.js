var debug = require('debug')('actions:extra')
  , settings = require('../settings')
  , BodyFlags = require('../sim/body-flags')
  , World = require('../world')
  , shapes = require('../sim/shapes')
  , icons = require('../extra-icons')
  , colliding = require('../support/aabb').colliding
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
  var src = settings.data.overrideSpawnExtras? settings.getSpawnlist(): world.level.extras;

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

  // find an extra based on probability
  var extra = prob(world,arr);

  //to many?

  if( extra.simultaneous ) {

    var currentExtras = 0;
    for (var i =  world.extras.values.length - 1; i >= 0; i--) {
      if( world.extras.values[i].data.id === extra.id ) {
        currentExtras++
        if( currentExtras >= extra.simultaneous ) {
          debug('To many extras of same kind');
          return;
        }
      }
    }
  }

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
    //console.log('body',body)
    //console.log('extra',extra)
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

  if( !validExtra(data) ){
    throw new Error('invalid extra: '+data.id)
    return;
  }

  var shape = shapes.rect(settings.data.unitSize,settings.data.unitSize);
  var extra = world.createBody(shape, x, y, BodyFlags.STATIC | BodyFlags.DESTROY | BodyFlags.GHOST)
  extra.id = 'extra';
  extra.data = data;
  world.extras.set(extra.index,extra)
  dmaf.tell( data.id + '_spawn');
  icons.create(world, extra)

  if( data.id == 'deathball') {
    actions.gameToggleDeathball(world,true)
    world.tick.clearTimeout(world.timeouts.deathballTimeout);
    world.timeouts.deathballTimeout = world.tick.setTimeout('gameToggleDeathball',(data.duration || 5)*1000,false);
  }

  world.tick.setTimeout('resetExtraGhost',settings.data.extraGhostDuration,extra.index)

  return extra;
}

exports.resetExtraGhost = function(world, extraIndex){
  debug('reset ghost',extraIndex)
  var extra = world.extras.get(extraIndex);
  BodyFlags.del(extra,BodyFlags.GHOST);
}

/**
 * Called when an extra pick-up has been hit by
 * the puck.
 *
 * @param  {World} world
 * @param  {Body} puck
 * @param  {Body} extra
 */
exports.hitPuckExtra = function(world, puck, extra){
  debug('%s hit %s puck: %s',world.name ,extra.index,puck.index)

  // skip if no player can be affected
  if( !world.lastHitPucks[puck.index] ){
    return;
  }

  // renderer effects
  actions.emit('renderer','activateExtra',{puck:puck, extra: extra})

  // remove extra (unlike obstacles, extras are removed)
  actions.destroyExtra(world,extra)

  var id = extra.data.id
    , data = extra.data;

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

  dmaf.tell( id + '_activate');

  var playerID = world.lastHitPucks[puck.index]
    , player = world.players[playerID]
    , paddle = world.paddles.get(player.paddle)

  switch(id){

    case 'extralife':
      icons.remove(world,extra)
      actions.regenerateShield(world,player)
      break;

    case 'ghostball':
      var ghostDuration = (data.duration || 7)*1000;

      // remove any old extra icons
      if( puck.data.ghostIcon ){
        icons.remove(world,puck.data.ghostIcon);
        delete puck.data.resizeIcon;
      }

      actions.puckToggleGhostball(world,puck.index,extra.index)
      world.tick.clearTimeout(puck.data.ghostballTimeout);
      puck.data.ghostballTimeout = world.tick.setTimeout('puckToggleGhostball', ghostDuration, puck.index,extra.index)
      break;

    case 'fireball':
      icons.remove(world,extra)

      // mark the paddle as fireball
      // to be transferred when a puck hits it
      paddle.data.fireball = 1;
      break;

    case 'mirroredcontrols':
      // mirror the controls
      actions.emit('renderer','mirrorEffect',{active: true})
      icons.activate(world,'mirroredcontrols')
      break;

    case 'bulletproof':
      var bulletproofDuration = (data.duration || 7) * 1000;

      // remove any old extra icons
      if( world.timeouts.bulletproof ){
        icons.remove(world,extra);
        delete world.timeouts.bulletproof;
      }

      actions.playerToggleBulletproof(world,playerID,true);
      world.tick.clearTimeout(world.timeouts.bulletproof);
      world.timeouts.bulletproof = world.tick.setTimeout('playerToggleBulletproof', bulletproofDuration, playerID, false)
      break;

    case 'paddleresize':
      var resizeDuration = (data.duration || 10) * 1000;

      // remove any old extra icons
      if( paddle.data.resizeIcon ){
        icons.remove(world,paddle.data.resizeIcon);
        delete paddle.data.resizeIcon;
      }

      actions.playerTogglePaddleResize(world,playerID,extra.index,true)
      world.tick.clearTimeout(paddle.data.resizeTimeout);
      paddle.data.resizeTimeout = world.tick.setTimeout('playerTogglePaddleResize',resizeDuration, playerID, extra.index, false);
      break;

    case 'deathball':
      world.tick.nextFrame('gameDeathballOver',puck.index);
      break;

    case 'timebomb':
      var radius = data.radius || settings.data.arenaHeight / 2;
      if( !puck.data.timebomb ){
        icons.activate(world,extra)
      } else {
        icons.remove(world,extra)
      }
      puck.data.timebomb = 1;
      world.tick.clearTimeout(puck.data.bombTimeout);
      puck.data.bombTimeout = world.tick.setTimeout('puckTimebombExplode', 4000, puck.index, extra.index, radius)
      break;

    case 'laser':
      var laserDuration = (data.duration || 5)*1000;

      // remove any old extra icons
      if( world.timeouts.laserTimeout ){
        icons.remove(world,extra);
        dmaf.tell('laser_over');
      }

      // only one laser at the time
      // if( world.timeouts.laserTimeout ) {
      var a = world.paddles.get(world.players.a.paddle);
      var b = world.paddles.get(world.players.b.paddle);
      if( a.data.laser == 1 ){ a.data.laser = 2; }
      if( b.data.laser == 1 ){ b.data.laser = 2; }
      // }

      actions.playerToggleLaser(world,playerID,true)
      world.tick.clearTimeout(world.timeouts.laserTimeout)
      world.timeouts.laserTimeout = world.tick.setTimeout('playerToggleLaser',laserDuration,playerID,false);
      break;

    case 'fog':
      var fogDuration = (data.duration || 5)*1000;
      if( world.timeouts.fog ){
        icons.remove(world, extra);
        delete world.timeouts.fog;
      }
      actions.gameToggleFog(world,true)
      world.tick.clearTimeout(world.timeouts.fog);
      world.timeouts.fog = world.tick.setTimeout('gameToggleFog',fogDuration,false)
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
      var speed = puck.velocity[1] < 0 ?  settings.data.unitSpeed: -settings.data.unitSpeed;
      actions.puckSpeedXY(world, n, 0, speed)

      icons.activate(world,extra)
      break;
  }
}

exports.destroyExtra = function(world, extra){
  debug('%s destroy',world.name ,extra.index);
  world.extras.del(extra.index)
  world.releaseBody(extra)
  actions.emit('removed','extra',world,extra);
  dmaf.tell( extra.data.id + '_remove');
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
    icons.remove(world,index)
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
  return arr[Math.round(world.random()*arr.length-0.5)]
}

function shuffle(world,arr){
  var array = arr.concat();
  var tmp, current, top = array.length;

  if(top){
    while(--top) {
      current = Math.floor(world.random() * (top + 1));
      tmp = array[current];
      array[current] = array[top];
      array[top] = tmp;
    }
  }

  return array;
}