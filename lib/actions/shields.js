var debug = require('debug')('actions:shields')
  , settings = require('../settings')
  , shapes = require('../sim/shapes')
  , BodyFlags = require('../sim/body-flags')
  , actions = require('../actions')
  , dmaf = require('../dmaf.min');

exports.createShields = function(world,player){
  var shields = world.level && world.level.player
              ? world.level.player.shields
              : settings.data.defaultShields;

  // return
  player.shields = makeArray(shields,1); // set to more than 1 for a stronger shield
  for(var i=0,l=player.shields.length; i<l; i++){
    actions.createShield(world,player,i,l);
  }
}

exports.createShield = function(world,player,i,length){
  debug('%s create',world.name ,player,i,length)
  // make sure the length is divisable by arena columns
  //if( !isInt(settings.data.arenaColumns/length) )
  //  throw new Error('invalid shield segment. must be divisable by arena columns.');

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
  // TODO make this more random
  // TODO make sure we set this to the same as in createShields()

  for(var i=0; i<player.shields.length; i++){
    if( player.shields[i] === 0 ){
      player.shields[i] = 1;
      actions.createShield(world,player,i,player.shields.length);
      break;
    }
  }
  //this.emit('renderer','heal',{player: player})
}

exports.hitShield = function(world,shield,body){
  debug('%s hit',world.name ,shield,puck)

  // double check that shield is a shield
  if( shield.id !== 'shield' ){
    throw new Error('invalid shield: '+shield.id)
    return
  }

  // double check that puck is a puck
  if( body.id == 'puck' ){

    var puck = body;

    // skip if puck already hit a shield this frame
    if( !puck.data.hitShield ){
      puck.data.hitShield = true;

      world.tick.nextFrame(function(){
        if( !puck.removed )
          puck.data.hitShield = false;
      })

      //set to ghostball
      BodyFlags.add(puck,BodyFlags.GHOST)
      world.tick.setTimeout(function(){
        BodyFlags.del(puck,BodyFlags.GHOST)
      },400) // 200ms = 6 or 12 frames

    } else {
      console.log('skipping hit shield because puck already hit a shield this frame')
      return;
    }

    // puck was fireball
    if( puck.data.fireball ){
      puck.data.fireball = 2; // turn off
      dmaf.tell("fireball_over");
    }

    // puck was ghostball
    if( puck.data.ghostball ){
      puck.data.ghostball = 2; // turn off
      dmaf.tell("ghost_ball_over");
    }

    // and if there's more than one puck left:
    // remove the colliding one
    /*if( world.pucks.values.length > 1 ){
      actions.destroyPuck(world,puck)
      dmaf.tell('multiball_over')
    }*/

    // shields also count as the 'last hit puck'
    world.lastHitPucks[puck.index] = player === world.players.a ? 'a' : 'b';

  } else if( body.id == 'bullet' ){
    var bullet = body;

    // TODO WAT?

  } else {
    throw new Error('invalid body to hit shield: '+body.id)
  }


  // check shield y to figure out player
  // TODO must be a better way to lookup (store in world.level perhaps?)
  var ah = settings.data.arenaHeight;
  var player = shield.current[1] > ah/2 ? world.players.a : world.players.b;

  if( player == world.players.a ){
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


function isInt(n){ return n===+n && n==(n|0)}

function makeArray(len,v){
  var a = [];
  for(var i=0; i<len; i++)
    a[i] = v;
  return a;
}