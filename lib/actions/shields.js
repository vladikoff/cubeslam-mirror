var debug = require('debug')('actions:shields')
  , settings = require('../settings')
  , shapes = require('../geom-sim/shapes')
  , BodyFlags = require('../geom-sim/body-flags')
  , actions = require('../actions');

exports.createShields = function(world,player){
  var shields = world.level && world.level.player
              ? world.level.player.shields
              : settings.data.defaultShields;

  player.shields = makeArray(shields,1);
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
    , w = settings.data.arenaColumns/length * settings.data.unitSize
    , h = settings.data.unitSize/2
    , x = w * i + w/2
    , y = (player === world.players.a ? h : ah-h)
    , s = world.createBody(shapes.rect(w,h),x,y,BodyFlags.STATIC | BodyFlags.BOUNCE | BodyFlags.DESTROY)
  s.id = 'shield' // used in collisions.js
  world.shields.set(s.index,s)
}

exports.regenerateShield = function(world,player){
  debug('regenerate',player)
  // TODO should be called when an 'extra life'-extra has been hit
  // TODO should pick one shield of player w. 0 and reset it to 1 as
  //      well as call createShield() again.
  this.emit('renderer','heal',{player: player})
}

exports.hitShield = function(world,shield,puck){
  debug('hit',shield,puck)

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
  var ac = settings.data.arenaColumns;
  var i = Math.round(ac/player.shields.length);

  // TODO player.shields[i]--
  // TODO also check for shield invincibility (active extras)
  var v = Math.max(0, --player.shields[i]);
  console.log('hit shield',v)

  // TODO and if shield is <=0 destroy it
  if( v == 0 )
    world.shields.del(shield.index)
}

exports.destroyShield = function(world,shield,puck){
  debug('destroy',shield,puck)
  world.shields.del(shield.index)
}


function isInt(n){ return n===+n && n==(n|0)}

function makeArray(len,v){
  var a = [];
  for(var i=0; i<len; i++)
    a[i] = v;
  return a;
}