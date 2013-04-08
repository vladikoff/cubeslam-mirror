var debug = require('debug')('actions:player')
  , settings = require('../settings')
  , inputs = require('../inputs');

exports.playerToggleBulletproof = function(world,playerID,active){
  var player = world.players[playerID]

  // find available shields
  for(var i=0; i<world.shields.length; i++){
    var shield = world.shields.values[i];

    // make sure shield belongs to player
    if( shield.data.player !== playerID )
      continue;

    // shield must be "up"
    if( player.shields[shield.data.index] === 0 )
      continue;

    // toggle bulletproof on
    if( active && !shield.data.bulletproof ){
      shield.data.bulletproof = 1;
    }

    // toggle bulletproof off
    if( !active && shield.data.bulletproof ){
      shield.data.bulletproof = 0;
    }
  }

  // TODO need access to `extra`
  // actions.emit('removeExtra','bulletproof',extra);
}

exports.playerTogglePaddleResize = function(world,playerID,active){
  var player = world.players[playerID]
    , paddle = world.paddles.get(player.paddle);
  if( active ){
    actions.resizePaddle(world,paddle,1.75);

  } else {
    actions.resizePaddle(world,paddle,1.0);

    // TODO need access to `extra`
    // actions.emit('removeExtra',id,extra);
  }

  actions.emit('renderer','paddleResize',{
    playerID: playerID,
    player: player,
    paddle: paddle
  })
}

exports.playerToggleLaser = function(world,playerID,active){
  var player = world.players[playerID]
    , paddle = world.paddles.get(player.paddle)
    , interval = 1000; // TODO use the extra.data.interval

  if( active ){
    // mark it as a laser paddle
    paddle.data.laser = 1;

    // shoot bullets at an interval
    world.tick.clearInterval(world.timeouts.laserInterval)
    world.timeouts.laserInterval = world.tick.setInterval('paddleShoot', interval, player.paddle)

  } else {
    world.tick.clearInterval(world.timeouts.laserInterval)
    dmaf.tell( "laser_over");
    paddle.data.laser = 2;

    // TODO need access to `extra`
    // actions.emit('removeExtra',id,extra);
  }
}

exports.playerHit = function(world,player,puck){
  console.log('%s hit',world.name ,player,puck.index)

  // only send HIT if it was me who was hit in multiplayer
  // otherwise send it everytime. (AI sucks at networking)
  if( (!world.multiplayer || world.name == 'game') && player == world.me ){
    var index = player === world.players.a ? 0 : 1;
    var x = puck.current[0]/settings.data.arenaWidth;
    inputs.record(inputs.types.HIT,index,x)
  }
}