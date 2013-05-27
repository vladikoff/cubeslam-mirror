var debug = require('debug')('states:game')
  , settings = require('../../settings')
  , mouse = require('../../support/mouse')
  , keys = require('mousetrap')
  , World = require('../../world')
  , inputs = require('../../inputs');

/*var KEYS_LEFT = ['left','up','a']
  , KEYS_RIGHT = ['right','down','d'];*/
var KEYS_LEFT = ['left','a']
  , KEYS_RIGHT = ['right','d'];

var isLeft = 0
  , isRight = 0;

var ctx;

exports.enter = function(context){
  ctx = context;
  ctx.game.on('pre update',onupdate)
  ctx.game.on('pre update',inputs.process)
  keys.bind(KEYS_LEFT,onleft,'keydown')
  keys.bind(KEYS_LEFT,offleft,'keyup')
  keys.bind(KEYS_RIGHT,onright,'keydown')
  keys.bind(KEYS_RIGHT,offright,'keyup')
  mouse.on('move',onmove.bind(null,ctx.game.world))
}

exports.leave = function(ctx){
  ctx.game.off('pre update',onupdate)
  ctx.game.off('pre update',inputs.process)
  keys.unbind(KEYS_LEFT,onleft,'keydown')
  keys.unbind(KEYS_LEFT,offleft,'keyup')
  keys.unbind(KEYS_RIGHT,onright,'keydown')
  keys.unbind(KEYS_RIGHT,offright,'keyup')
  mouse.off('move')
}

function onupdate(world,timestep){
  switch(world.state){
    case World.PREVIEW:
    case World.PLAYING:
    case World.OVER:
      break;
    default:
      return;
  }
  // if( ctx.query.benchmark ) return;
  var dir = settings.data.invertControls ? -1 : 1
  isLeft  && inputs.record(inputs.types.MOVE,world.me.paddle,eps(-settings.data.keyboardSensitivity*dir));
  isRight && inputs.record(inputs.types.MOVE,world.me.paddle,eps(+settings.data.keyboardSensitivity*dir));
  if(ctx.touch){
    mouse.tick() // will emit 'move' or 'click'
  }
}

function onmove(world,dx,dy,dt){
  // if( ctx.query.benchmark ) return;
  var dir = settings.data.invertControls ? -1 : 1
  inputs.record(inputs.types.MOVE,world.me.paddle,eps(dx * settings.data.mouseSensitivity*dir))
}

function onleft(){ isLeft = 1 }
function onright(){ isRight = 1 }
function offleft(){ isLeft = 0 }
function offright(){ isRight = 0 }
function eps(x){ return Math.round(x*1000)/1000 }
