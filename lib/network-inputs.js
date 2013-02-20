var debug = require('debug')('network-inputs')
  , keys = require('mousetrap')
  , World = require('./world')
  , debug = require('debug')('network-inputs')
  // , debug = require('./support/logger')('network-inputs')
  , buffer = require('./support/buffer')
  , settings = require('./settings')
  , actions = require('./actions')
  , see = require('./support/see')
  , hashCode = require('./support/hash-code')
  , diff = require('./support/diff')
  , $ = require('jquery');


// a global context (one every start())
// lastSeq is used to make sure no packets are dropped
// lastFrame is to send ACKs if it was "too long ago"
var ctx
  , lastSeq
  , lastFrame = 0
  , isReplaying = false
  , waitForZero = false;

// [frame,type,args...,frame,type,args...]
var localQueue = []
  , networkQueue = []

// only call the hash comparison
// once / forward
var isComparing = false;
var hashes = {}
  , jsons = {};


exports.reset = function(){
  debug('reset')
  localQueue.length = 0;
  networkQueue.length = 0;
  lastSeq = null;
  hashes = {}
  jsons = {}
  waitForZero = true;
}

exports.start = function(context){
  ctx = context;
  keys.bind('f',manualForward)
  keys.bind('r',replay)

  // network replay
  keys.bind('t',function(){ network.remote.signal.send({type:'replay'}) })
  ctx.network.remote.on('replay',replay)

  // local diff
  keys.bind(',',function(){
    var diff = actions.debugDiff(ctx.game.world);
    console.log(diff)
  })

  // network diff (comparison)
  keys.bind('c',function(){
    var diff = actions.debugDiff(ctx.networkGame.world);
    ctx.network.remote.signal.send({type:'diff',diff: diff})
  })
  ctx.network.remote.on('diff',function(e){
    actions.debugDiff(ctx.networkGame.world,e.diff)
  })

  // compare hashes
  keys.bind('.',function(){
    if( !isComparing ){
      ctx.network.remote.signal.send({type:'hashes',hashes: hashes})
      isComparing = true;
    }
  })
  ctx.network.remote.on('hashes',function(e){
    var frames = [].concat(Object.keys(e.hashes),Object.keys(hashes))
                   .sort(function(a,b){return parseInt(a)-parseInt(b)});
    console.groupCollapsed('comparing hashes')
    var misMatch = null
      , f = -1; // last frame
    for(var i=0; i<frames.length; i++){
      var frame = frames[i];
      if( f === frame ) continue;
      f = frame;
      console.log(' frame: %s local: %s network: %s',frame,hashes[frame],e.hashes[frame]);
      if( hashes[frame] && e.hashes[frame] && hashes[frame] !== e.hashes[frame] ){
        console.log(' hashes does not match, sending json of world to compare')
        ctx.network.remote.signal.send({type:'world',frame: frame,world: jsons[frame]})
        actions.gamePause(ctx.game.world)
        misMatch = frame;
        break;
      }
    }
    console.groupEnd('comparing hashes')
    if( misMatch !== null )
      console.error('hashes did not match at %s',misMatch)
  })
  ctx.network.remote.on('world',function(e){
    console.group('comparing worlds at frame %s',e.frame)
    if( jsons[e.frame] !== e.world ){
      console.log('NOT THE SAME, trying diff:')
      console.log(diff.createPatch('diff for frame '+e.frame,jsons[e.frame],e.world,'local','remote'))
      console.log('remote',[JSON.parse(e.world)])
      console.log('local',[JSON.parse(jsons[e.frame])])
      actions.gamePause(ctx.game.world)
    }
    console.groupEnd('comparing worlds at frame %s',e.frame)
  })



  // log the sync hashes by frame
  ctx.networkGame.on('post update',function(world){
    // hash and store without me/opponent/name
    exclude(world,['me','opponent','name'],function(world){
      hashes[world.frame] = hashCode(world)
      jsons[world.frame] = JSON.stringify(world,unhide,2)
    })

    // send hashes every second
    if( !isComparing && world.frame % 30 === 0 )
      keys.trigger('.');
  })

  ctx.game.on('post update',flush);
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

  if( waitForZero ){
    if( frame > 0 ){
      console.log('waiting for frame 0')
      return;
    } else {
      waitForZero = false;
    }
  }

  if( lastSeq && Math.abs(lastSeq-inSeq) > 1 ){
    console.error('DROPPED PACKETS! %s -> %s',lastSeq,inSeq)
    throw new Error('dropped packets. game will lose sync.')
  }
  lastSeq = inSeq;

  if( frame < networkQueue[0] ){
    console.log('WHY ARE WE ADDING THIS NOW?')
    throw new Error('invalid frame order');
  }

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

  if( world.frame < localQueue[0] ){
    console.log('WHY ARE WE ADDING THIS NOW?')
    throw new Error('invalid frame order');
  }

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
  lastFrame = world.frame;

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
    debug('%s skipping forwarding (to %s), no network events',src,frame);
    return false;
  }

  var a = game.world.frame
    , b = frame
    , steps = b - a;

  if( a === b ){
    debug('%s skipping forwarding. no steps between %s and %s',src,a,b);
    return false;
  }

  console.groupCollapsed('%s forwarding %s to %s',src,a,b)
  console.log('  l:',localQueue)
  console.log('  n:',networkQueue)

  for(var i=0; i < steps; i++){
    checkQueue('l',localQueue,game)
    checkQueue('n',networkQueue,game)
    game.update();
  }
  game.render()

  debug('forwarded %s to %s',game.world.name,game.world.frame)
  console.groupEnd('%s forwarding %s to %s',src,a,b)
  isComparing = false;
  return true;
}


function replay(){
  var fromGame = ctx.networkGame
    , toGame = ctx.game
    , a = fromGame.world.frame
    , b = toGame.world.frame
    , steps = b - a;

  // TODO avoid creating new arrays every replay...
  var rLocalQueue = localQueue.concat()
    , rNetworkQueue = networkQueue.concat();

  console.groupCollapsed('replaying %s to %s',a,b)
  console.log('  l:',rLocalQueue)
  console.log('  n:',rNetworkQueue)
  var hadSounds = settings.data.sounds;
  isReplaying = true;
  actions.emit('replay start')
  settings.data.sounds = false;
  toGame.world.copy(fromGame.world);
  toGame.inputs.copy(fromGame.inputs);

  var hashTo, hashFrom, jsonTo, jsonFrom;
  var excluded = 'me opponent name'.split(' ');
  exclude(toGame.world,excluded,function(world){
    hashTo = hashCode(world);
  })
  exclude(fromGame.world,excluded,function(world){
    hashFrom = hashCode(world);
  })
  if( hashTo !== hashFrom ){
    console.error('hash codes to not match after copy from: %s to: %s',hashTo,hashFrom)
    jsonTo = JSON.stringify(toGame.world,unhide,2);
    jsonFrom = JSON.stringify(fromGame.world,unhide,2);
    console.log(JSON.parse(jsonFrom))
    console.log(JSON.parse(jsonTo))
    console.log(diff.createPatch('diff for frame '+toGame.world.frame,jsonFrom,jsonTo,'from (sync)','to (game)'))
    actions.gamePause(ctx.game.world)
    return;
  }

  for(var i=0; i < steps; i++){
    checkQueue('l',rLocalQueue,toGame)
    checkQueue('n',rNetworkQueue,toGame)
    toGame.update();
  }
  debug('replayed %s to %s',toGame.world.name,toGame.world.frame)
  console.log('  l:',rLocalQueue)
  console.log('  n:',rNetworkQueue)
  isReplaying = false;
  actions.emit('replay end')
  settings.data.sounds = hadSounds;
  console.groupEnd('replaying %s to %s',a,b)
}

function checkQueue(name,q,game){
  // console.log('check %s queue %s == %s?',name,q[0],game.world.frame)

  if( q[0] && game.world.frame > q[0] ){
    // throw new Error(name+' missed a queued frame. '+q[0]+' < '+game.world.frame)
    debugger;
  }

  while( q[0] === game.world.frame ){
    var frame = q.shift()
      , type = q.shift();
    switch(type){
      case World.ACK:
        debug('%s %s queued ack (does nothing)',name,frame)
        break
      case World.MOVE:
        var p = q.shift();
        var x = q.shift();
        debug('%s %s queued move',name,frame,p,x)
        game.emit('input',type,p,x)
        break;
      case World.SHOOT:
        var p = q.shift();
        debug('%s %s queued shoot',name,frame,p)
        game.emit('input',type,p)
        break;
      case World.PAUSE:
        debug('%s %s queued pause',name,frame)
        game.emit('input',type)
        break;
      case World.PLAY:
        debug('%s %s queued play',name,frame)
        game.emit('input',type)
        break;
      case World.OVER:
        debug('%s %s queued over',name,frame)
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
  if( ctx.game.world.state === World.PLAYING && Math.abs(ctx.game.world.frame - lastFrame) > 10 ){
    ctx.game.emit('input',World.ACK)
    lastFrame = ctx.game.world.frame;
  }
}



// temporary excludes properties in `obj` defined in `excluded`
// calls fn with the obj and then adds the properties back after
// the callback.
function exclude(obj,excluded,fn){
  var map = {}
  excluded.forEach(function(prop){
    var props = prop.split('.');
    var tmp = obj;
    for (var i = 0; i < props.length; ++i) {
      var name = props[i];
      if( i == props.length-1 ){
        map[prop] = tmp[name]
        delete tmp[name]
      } else {
        tmp = tmp[name];
      }
    }
  })
  fn(obj)
  Object.keys(map).forEach(function(prop){
    var props = prop.split('.');
    var tmp = obj;
    for (var i = 0; i < props.length; ++i) {
      var name = props[i];
      if( i == props.length-1 ){
        tmp[name] = map[prop];
      } else {
        tmp = tmp[name];
      }
    }
  })
}
// used as JSON replacer to
// find undefined values
function unhide(k,v){
  if( typeof v == 'undefined' )
    return 'undefined'
  return v;
}