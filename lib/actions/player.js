var debug = require('debug')('actions:player')
  , settings = require('../settings')
  , inputs = require('../inputs')
  , actions = require('../actions')
  , icons = require('../extra-icons')
  , dmaf = require('../dmaf.min');

exports.playerToggleBulletproof = function(world,playerID,active){
  var player = world.players[playerID]
    , paddle = world.paddles.get(player.paddle);

  // find available shields
  for(var i=0; i<world.shields.length; i++){
    var shield = world.shields.values[i];

    // make sure shield belongs to player
    if( shield.data.player !== playerID ){
      shield.data.bulletproof = 0; // or make sure they're off
      continue;
    }

    // shield must be "up"
    if( player.shields[shield.data.index] === 0 ){
      continue;
    }

    // toggle bulletproof on
    if( active && !shield.data.bulletproof ){
      shield.data.bulletproof = 1;
    }

    // toggle bulletproof off
    if( !active && shield.data.bulletproof ){
      shield.data.bulletproof = 0;
    }
  }

  if( active ){
    icons.activate(world,'bulletproof');
  } else {
    icons.remove(world,'bulletproof');
    delete world.timeouts.bulletproof;
  }
}

exports.playerTogglePaddleResize = function(world,playerID,extraIndex,active){
  var player = world.players[playerID]
    , paddle = world.paddles.get(player.paddle);

  if( active ){
    actions.resizePaddle(world,player.paddle,1.75);
    icons.activate(world,extraIndex)
    paddle.data.resizeIcon = extraIndex;

  } else {
    actions.resizePaddle(world,player.paddle,1.0);
    icons.remove(world,extraIndex);
    delete paddle.data.resizeIcon;
    delete paddle.data.resizeTimeout;
  }

  actions.emit('renderer','paddleResize',{
    playerID: playerID,
    width: paddle.aabb[1] - paddle.aabb[3]
  })
}

exports.playerToggleLaser = function(world,playerID,active){
  var player = world.players[playerID]
    , paddle = world.paddles.get(player.paddle)
    , interval = 1000; // TODO use the extra.data.interval

  if( active ){
    // mark it as a laser paddle
    paddle.data.laser = 1;
    icons.activate(world,'laser')

    // shoot bullets at an interval
    world.tick.clearInterval(world.timeouts.laserInterval)
    world.timeouts.laserInterval = world.tick.setInterval('paddleShoot', interval, player.paddle)

  } else {
    world.tick.clearInterval(world.timeouts.laserInterval)
    dmaf.tell('laser_over');
    icons.remove(world,'laser');
    delete world.timeouts.laserTimeout;
    paddle.data.laser = 2;
    world.tick.nextFrame('resetPaddleExtra',player.paddle,'laser')
  }
}

exports.playerHit = function(world,player,puck){
  debug('%s hit',world.name ,player,puck.index)

  // only send HIT if it was me who was hit in multiplayer
  // otherwise send it everytime. (AI sucks at networking)
  if( !world.multiplayer || (world.name == 'game' && player == world.me) ){
    var index = player === world.players.a ? 0 : 1;
    var x = puck.current[0]/settings.data.arenaWidth;
    inputs.record(inputs.types.DIED,index,x)
  }

}