var debug = require('debug')('network-inputs')
  , keys = require('mousetrap')
  , World = require('./world')
  , buffer = require('./support/buffer')
  , settings = require('./settings')
  , actions = require('./actions')
  , see = require('./support/see');


// a global context (one every start())
var ctx
  , isReplaying = false;

// [frame,type,args...,frame,type,args...]
var localQueue = []
  , networkQueue = []

exports.start = function(context){
  ctx = context;
  keys.bind('f',manualForward)
  keys.bind('r',replay)
  keys.bind('t',function(){ network.remote.signal.send({type:'replay'}) })
  ctx.network.remote.on('replay',replay)

  keys.bind(',',function(){
    var diff = actions.debugDiff(ctx.game.world);
    console.log(diff)
  })

  keys.bind('c',function(){
    var diff = actions.debugDiff(ctx.networkGame.world);
    ctx.network.remote.signal.send({type:'diff',diff: diff})
  })

  ctx.network.remote.on('diff',function(e){
    actions.debugDiff(ctx.networkGame.world,e.diff)
  })
  ctx.game.on('apply',oninputs)
  ctx.network.on('message',onmessage)

  var roundOver = 2;
  ctx.network.remote.on('round over',function(){
    forward(ctx.networkGame,ctx.game.world.frame) && replay()
    --roundOver || see('/game/next')
  })
  actions.on('round over',function(world){
    // only the synchronized game counts...
    if( world === ctx.networkGame.world ){
      ctx.network.remote.signal.send({type:'round over'})
      --roundOver || see('/game/next')
    }
  })
}

exports.stop = function(){
  ctx.network.remote.off('replay')
  ctx.network.remote.off('diff')
  ctx.network.off('message',onmessage)
  ctx.game.off('apply',oninputs)
  keys.unbind('c')
  keys.unbind(',')
  keys.unbind('f')
  keys.unbind('r')
  keys.unbind('t')
}


function onmessage(buf){
  var data = new buffer.Reader(buf);
  var frame = data.getUint16()

  while(data.offset < buf.byteLength){
    var type = data.getInt8();
    switch(type){
      case World.MOVE:
        var p = data.getUint8();
        var x = data.getFloat32();
        debug('%s network move',frame,p,x)
        networkQueue.push(frame,type,p,x)
        break;
      case World.SHOOT:
        var p = data.getUint8();
        debug('%s network shoot',frame,p)
        networkQueue.push(frame,type,p)
        break;
      case World.PAUSE:
        debug('%s network pause',frame)
        networkQueue.push(frame,type)
        break;
      case World.PLAY:
        debug('%s network play',frame)
        networkQueue.push(frame,type)
        break;
      case World.OVER:
        debug('%s network over',frame)
        networkQueue.push(frame,type)
        break;
      default:
        console.error('invalid network input')
        return false;
    }
  }

  forward(ctx.networkGame,frame) && replay()
}

function oninputs(world,inputs,size){
  if( !size ) return;
  if( isReplaying ) return;
  if( world.over ) return;
  var buf = new ArrayBuffer(2+size);
  var data = new buffer.Writer(buf);
  data.setUint16(world.frame);
  for(var i=0; i < inputs.length;) {
    var type = inputs[i++];
    data.setInt8(type);
    switch(type){
      case World.MOVE:
        var p = inputs[i++];
        var x = inputs[i++];
        data.setUint8(p);
        data.setFloat32(x);
        debug('%s local move',world.frame,p,x)
        localQueue.push(world.frame,type,p,x)
        break;
      case World.SHOOT:
        var p = inputs[i++];
        data.setUint8(p);
        debug('%s local shoot',world.frame,p)
        localQueue.push(world.frame,type,p)
        break;
      case World.PAUSE:
        debug('%s local pause',world.frame)
        localQueue.push(world.frame,type)
        break;
      case World.PLAY:
        debug('%s local play',world.frame)
        localQueue.push(world.frame,type)
        break;
      case World.OVER:
        debug('%s local over',world.frame)
        localQueue.push(world.frame,type)
        break;
      default:
        console.error('unknown type',type)
        return null;
    }
  }
  ctx.network.send(buf);

  forward(ctx.networkGame,world.frame) && replay()
}

function manualForward(){
  forward(ctx.networkGame,ctx.game.world.frame)
}


function forward(game,frame){
  // console.log('forward to',frame)
  // update the networkGame with both
  // local and network input until it's
  // `world.frame == frame`
  if( !networkQueue.length ){
    debug('skipping forwarding, no network events');
    return false;
  }

  debug('forwarding %s to %s',game.world.frame,frame)
  // console.log('  l:',localQueue)
  // console.log('  n:',networkQueue)

  var fwd = false;
  var steps = frame - game.world.frame;
  for(var i=0; i < steps; i++ ){
    // check if there's any queued local inputs to
    // be applied.
    fwd = true;
    checkQueue('l',localQueue,game)
    checkQueue('n',networkQueue,game)
    game.update();
  }
  if( fwd ){
    debug('forwarded %s to %s',game.world.name,game.world.frame)
    // console.log('  l:',localQueue)
    // console.log('  n:',networkQueue)
  } else {
    debug('  no forwarding n: %s l: %s',networkQueue[0],frame)
  }
  return fwd;
}


function replay(){
  var fromGame = ctx.networkGame
    , toGame = ctx.game
    , steps = toGame.world.frame - fromGame.world.frame;

  // TODO avoid creating new arrays every replay...
  var rLocalQueue = localQueue.concat()
    , rNetworkQueue = networkQueue.concat();

  debug('replaying %s to %s',fromGame.world.frame,toGame.world.frame)
  // console.log('  l:',localQueue)
  // console.log('  n:',networkQueue)

  isReplaying = true;
  settings.data.sounds = false;
  toGame.world.copy(fromGame.world);
  toGame.inputs.copy(fromGame.inputs);

  for(var i=0; i < steps; i++){
    checkQueue('l',localQueue,toGame)
    checkQueue('n',networkQueue,toGame)
    toGame.update();
  }
  debug('replayed %s to %s',toGame.world.name,toGame.world.frame)
  // console.log('  l:',localQueue)
  // console.log('  n:',networkQueue)
  isReplaying = false;
}

function checkQueue(name,q,game){
  // console.log('check %s queue %s == %s?',name,q[0],game.world.frame)
  while( q[0] === game.world.frame ){
    var frame = q.shift()
      , type = q.shift();
    switch(type){
      case World.MOVE:
        var p = q.shift();
        var x = q.shift();
        debug('%s queued move',frame,p,x)
        game.emit('input',type,p,x)
        break;
      case World.SHOOT:
        var p = q.shift();
        debug('%s queued shoot',frame,p)
        game.emit('input',type,p)
        break;
      case World.PAUSE:
        debug('%s queued pause',frame)
        game.emit('input',type)
        break;
      case World.PLAY:
        debug('%s queued play',frame)
        game.emit('input',type)
        break;
      case World.OVER:
        debug('%s queued over',frame)
        game.emit('input',type)
        break;
      default:
        console.error('unknown type in queue',type)
    }
  }
}
