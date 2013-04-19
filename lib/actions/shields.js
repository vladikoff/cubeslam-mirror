var debug = require('debug')('actions:shields')
  , settings = require('../settings')
  , shapes = require('../sim/shapes')
  , BodyFlags = require('../sim/body-flags')
  , actions = require('../actions')
  , inputs = require('../inputs')
  , dmaf = require('../dmaf.min');

exports.createShields = function(world,player){
  var shields = world.level && world.level.player
              ? world.level.player.shields
              : settings.data.defaultShields;

  player.shields = makeArray(shields,1); // set to more than 1 for a stronger shield
  for(var i=0,l=player.shields.length; i<l; i++){
    actions.createShield(world,player,i,l);
  }
}

exports.createShield = function(world,player,i,length){
  debug('%s create',world.name ,player,i,length)

  // creates a shield 1 unit deep and x units wide
  var ah = settings.data.arenaHeight
    , w = settings.data.arenaColumns/length * settings.data.unitSize-5
    , h = settings.data.unitSize/8
    , x = w * i + w/2 + 5*i
    , y = (player === world.players.b ? h : ah-h)
    , s = world.createBody(shapes.rect(w,h),x,y,BodyFlags.STATIC | BodyFlags.BOUNCE | BodyFlags.DESTROY)
  s.id = 'shield' // used in collisions.js
  s.data.player = player === world.players.a ? 'a' : 'b'; // (used by hitExtra)
  s.data.index = i // index in player.shields (used by hitExtra)
  world.shields.set(s.index,s)
  actions.emit('added','shield',world,s)
}


// pick one shield of player w. 0 and reset it to 1 as
// well as call createShield() again.
exports.regenerateShield = function(world,player){
  debug('%s regenerate',world.name ,player)
  for(var i=0; i<player.shields.length; i++){
    if( player.shields[i] === 0 ){
      player.shields[i] = 1;
      actions.createShield(world,player,i,player.shields.length);
      break;
    }
  }
}

exports.hitShield = function(world,shield,body){
  debug('%s hit', world.name, shield, body)

  // double check that shield is a shield
  if( shield.id !== 'shield' ){
    throw new Error('invalid shield: '+shield.id)
    return
  }


  var player = shield.data.player == 'a'
    ? world.players.a
    : world.players.b;

  // double check that puck is a puck
  if( body.id == 'puck' ){

    var puck = body;

    // skip if puck already hit a shield this frame
    if( !puck.data.hitShield ){
      actions.puckToggleHit(world,puck.index,true)
      world.tick.nextFrame('puckToggleHit',puck.index,false)

      // make the puck a ghost for a few frames
      // to avoid collisions
      actions.puckToggleGhostFlag(world,puck.index,true)
      world.tick.clearTimeout(puck.data.ghostTimeout);
      puck.data.ghostTimeout = world.tick.setTimeout('puckToggleGhostFlag',400,puck.index,false)

    } else {
      debug('skipping hit shield because puck already hit a shield this frame')
      return;
    }

    // puck was fireball
    if( puck.data.fireball ){

      //set to 2 will trigger out animation
      puck.data.fireball = 2; // turn off

      world.tick.nextFrame('resetPuckExtra',puck.index,'fireball')
      dmaf.tell("fireball_over");
    }

    if( world.multiplayer && world.name == 'game' ){
      if( player !== world.opponent ){
        var paddle = world.paddles.get(player.paddle);
        inputs.record(inputs.types.MISS,paddle.current[0])
      }
    }

    // shields also count as the 'last hit puck'
    world.lastHitPucks[puck.index] = player === world.players.a ? 'a' : 'b';

  } else if( body.id == 'bullet' ){
    var bullet = body;
    return false;
    // TODO WAT?

  } else {
    throw new Error('invalid body to hit shield: '+body.id)
  }

  if( player == world.opponent ){
    dmaf.tell('opponent_shield_hit')
  } else {
    dmaf.tell('user_shield_hit')
  }

  // check shield x to figure out index
  // TODO must be a better way to lookup (store in world.level perhaps?)
  var aw = settings.data.arenaWidth;
  var i = Math.floor(shield.current[0]/aw*player.shields.length);

  // lower hit shield by 1 unless bullet proof
  if( !shield.data.bulletproof ){
    var v = Math.max(0, --player.shields[i]);
    // and if shield is fully down destroy it
    if( v == 0 ){
      exports.destroyShield(world,shield)
    }
  }
}

exports.destroyShield = function(world,shield){
  debug('%s destroy',world.name ,shield)
  world.shields.del(shield.index)
  world.releaseBody(shield)
  actions.emit('removed','shield',world,shield)
}


function makeArray(len,v){
  var a = [];
  for(var i=0; i<len; i++)
    a[i] = v;
  return a;
}