var debug = require('debug')('network-inputs')
  , keys = require('mousetrap')
  , World = require('./world')
  , debug = require('debug')('network-inputs')
  // , debug = require('./support/logger')('network-inputs')
  , buffer = require('./support/buffer')
  , settings = require('./settings')
  , actions = require('./actions')
  , see = require('./support/see')
  , $ = require('jquery');


// a global context (one every start())
// lastSeq is used to make sure no packets are dropped
// lastFrame is to send ACKs if it was "too long ago"
var ctx
  , lastSeq
  , lastFrame
  , isReplaying = false
  , sendingAck = false;

// [frame,type,args...,frame,type,args...]
var localQueue = []
  , networkQueue = []

exports.reset = function(){
  debug('reset')
  localQueue.length = 0;
  networkQueue.length = 0;
  lastSeq = null;
}

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

  ctx.game.on('post update',flush);

  ctx.network.remote.on('diff',function(e){
    actions.debugDiff(ctx.networkGame.world,e.diff)
  })
  ctx.game.on('apply',oninputs)
  ctx.network.on('message',onmessage)

  actions.on('round over',function(world){
    debug('%s round over %s',world.name, world.frame)

    // both games agree on round over, go on!
    if( world.name === 'sync' ){
      // emit ACK to make sure the other player
      // will forward up to this point
      // ctx.game.emit('input',World.ACK)

      debug('round over, anything in the queues?')
      debug(' local:',localQueue)
      debug(' network:',networkQueue)

      ctx.game.emit('input',World.OVER)

      // start fresh
      see('/game/next')


    } else {
      // send an a PAUSE (to pause the game) and an OVER packet
      // since no more inputs should be recorded until
      // next round
      // ctx.game.emit('input',World.PAUSE)
      // ctx.game.emit('input',World.OVER)
    }
  })
}

exports.stop = function(){
  if(!ctx) return console.error('tried to stop inputs without ctx');
  ctx.network.remote.off('replay')
  ctx.network.remote.off('diff')
  ctx.network.off('message',onmessage)
  ctx.game.off('apply',oninputs)
  ctx.game.off('post update',flush)
  keys.unbind('c')
  keys.unbind(',')
  keys.unbind('f')
  keys.unbind('r')
  keys.unbind('t')
}


function onmessage(buf){
  var data = new buffer.Reader(buf);
  var inSeq = data.getUint16()
  var frame = data.getUint16()

  if( lastSeq && Math.abs(lastSeq-inSeq) > 1 ){
    console.error('DROPPED PACKETS! %s -> %s',lastSeq,inSeq)
    throw new Error('dropped packets. game will lose sync.')
  }
  lastSeq = inSeq;
  lastFrame = frame;
  sendingAck = false;

  while(data.offset < buf.byteLength){
    var type = data.getInt8();
    switch(type){
      case World.ACK:
        debug('%s network ack',frame)
        networkQueue.push(frame,type)
        break;
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

  forward('network',ctx.networkGame,Math.min(ctx.game.world.frame,frame)) && replay()
}

var seq = 0;
function oninputs(world,inputs,size){
  if( !size )
    return;// debug('skipping apply. no input');
  if( isReplaying )
    return debug('skipping apply. is replaying');
  if( world.state !== World.PLAYING && world.state !== World.PAUSED )
    return debug('skipping apply. not playing');
  var buf = new ArrayBuffer(4+size);
  var data = new buffer.Writer(buf);
  data.setUint16(seq++);
  data.setUint16(world.frame);
  for(var i=0; i < inputs.length;) {
    var type = inputs[i++];
    data.setInt8(type);
    switch(type){
      case World.ACK:
        debug('%s local ack',world.frame)
        break
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
      case World.PLAY:
      case World.OVER:
        debug('%s local state',world.frame,type)
        localQueue.push(world.frame,type)
        break;
      default:
        console.error('unknown type',type)
        return null;
    }
  }
  ctx.network.send(buf);

  forward('inputs',ctx.networkGame,Math.min(ctx.networkGame.world.frame,world.frame)) && replay()
}

function manualForward(){
  debug('manual forward to %s',ctx.game.world.frame);
  return forward('manual',ctx.networkGame,ctx.game.world.frame)
}


function forward(src,game,frame){
  // update the networkGame with both
  // local and network input until it's
  // `world.frame == frame`
  if( !networkQueue.length ){
    debug('skipping forwarding (to %s), no network events',frame);
    return false;
  }

  var a = game.world.frame
    , b = frame;
  console.groupCollapsed('%s forwarding %s to %s',src,a,b)
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
  console.groupEnd('%s forwarding %s to %s',src,a,b)
  return fwd;
}


function replay(){
  var fromGame = ctx.networkGame
    , toGame = ctx.game
    , steps = toGame.world.frame - fromGame.world.frame;

  if( steps < 1 ){
    debug('skipping replay, no steps between %s and %s',fromGame.world.frame,toGame.world.frame)
    return;
  }

  // TODO avoid creating new arrays every replay...
  var rLocalQueue = localQueue.concat()
    , rNetworkQueue = networkQueue.concat();

  debug('replaying %s to %s',fromGame.world.frame,toGame.world.frame)
  // console.log('  l:',localQueue)
  // console.log('  n:',networkQueue)
  var hadSounds = settings.data.sounds;
  isReplaying = true;
  actions.emit('replay start')
  settings.data.sounds = false;
  toGame.world.copy(fromGame.world);
  toGame.inputs.copy(fromGame.inputs);

  for(var i=0; i < steps; i++){
    checkQueue('l',rLocalQueue,toGame)
    checkQueue('n',rNetworkQueue,toGame)
    toGame.update();
  }
  debug('replayed %s to %s',toGame.world.name,toGame.world.frame)
  // console.log('  l:',localQueue)
  // console.log('  n:',networkQueue)
  isReplaying = false;
  actions.emit('replay end')
  settings.data.sounds = hadSounds;
}

function checkQueue(name,q,game){
  // console.log('check %s queue %s == %s?',name,q[0],game.world.frame)

  if( q[0] && game.world.frame > q[0] ){
    throw new Error(name+' missed a queued frame. '+q[0]+' < '+game.world.frame)
  }

  while( q[0] === game.world.frame ){
    var frame = q.shift()
      , type = q.shift();
    switch(type){
      case World.ACK:
        debug('%s queued ack',frame)
        break
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

function flush(){
  $('#scores .frame').html('l: '+ctx.game.world.frame+' n: '+ctx.networkGame.world.frame)

  // if the difference in frames are more than a second, send an ACK
  // this is so the upcoming forward/replay won't be too long.
  if( !sendingAck && Math.abs(ctx.game.world.frame - lastFrame) > 30 ){
    sendingAck = true;
    ctx.game.emit('input',World.ACK)
  }
}