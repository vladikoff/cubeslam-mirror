var debug = require('debug')('actions:shields')
  , settings = require('../settings')
  , shapes = require('../geom-sim/shapes')
  , BodyFlags = require('../geom-sim/body-flags')
  , actions = require('../actions');

exports.createShields = function(world,player){
  var shields = world.level && world.level.player
              ? world.level.player.shields
              : settings.data.defaultShields;

  // return
  player.shields = makeArray(shields,1); // set to more than 1 for a stronger shield
  for(var i=0,l=player.shields.length; i<l; i++)
    actions.createShield(world,player,i,l);
}

exports.createShield = function(world,player,i,length){
  debug('create',player,i,length)
  // make sure the length is divisable by arena columns
  if( !isInt(settings.data.arenaColumns/length) )
    throw new Error('invalid shield segment. must be divisable by arena columns.');

  // creates a shield 1 unit deep and x units wide
  var ah = settings.data.arenaHeight
    , w = settings.data.arenaColumns/length * settings.data.unitSize-5
    , h = settings.data.unitSize/8
    , x = w * i + w/2 + 5*i
    , y = (player === world.players.a ? h : ah-h)
    , s = world.createBody(shapes.rect(w,h),x,y,BodyFlags.STATIC | BodyFlags.BOUNCE | BodyFlags.DESTROY)
  s.id = 'shield' // used in collisions.js
  world.shields.set(s.index,s)
}


// pick one shield of player w. 0 and reset it to 1 as
// well as call createShield() again.
exports.regenerateShield = function(world,player){
  debug('regenerate',player)
  // TODO make this more random
  // TODO make sure we set this to the same as in createShields()
  for(var i=0; i<player.shields.length; i++){
    if( player.shields[i] === 0 ){
      player.shields[i] = 1;
      actions.createShield(world,player,i,player.shields.length);
      break;
    }
  }
  this.emit('renderer','heal',{player: player})
}

exports.hitShield = function(world,shield,puck){
  debug('hit',shield,puck)

  // puck was fireball
  if( puck.data.fireball ){
    puck.data.fireball = 2; // turn off
  }

  // and if there's more than one puck left:
  // remove the colliding one
  if( world.pucks.values.length > 1 )
    actions.puckDestroy(world,puck)

  // check shield y to figure out player
  // TODO must be a better way to lookup (store in world.level perhaps?)
  var ah = settings.data.arenaHeight;
  var player = shield.current[1] > ah/2 ? world.players.b : world.players.a;

  // check shield x to figure out index
  // TODO must be a better way to lookup (store in world.level perhaps?)
  var aw = settings.data.arenaWidth;
  var i = Math.floor(shield.current[0]/aw*player.shields.length);

  // lower hit shield by 1
  // TODO also check for "bullet proof"-shield (world.activeExtras)
  var v = Math.max(0, --player.shields[i]);

  // shields also count as the 'last hit puck'
  world.lastHitPucks[puck.index] = player;

  // and if shield fully down destroy it
  if( v == 0 )
    exports.destroyShield(world,shield,puck)
}

exports.destroyShield = function(world,shield,puck){
  debug('destroy',shield,puck)
  world.shields.del(shield.index)
  world.releaseBody(shield);
}


function isInt(n){ return n===+n && n==(n|0)}

function makeArray(len,v){
  var a = [];
  for(var i=0; i<len; i++)
    a[i] = v;
  return a;
}