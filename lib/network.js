var Emitter = require('emitter')
  , NetChannel = require('netchan')
  , TimeSync = require('./support/time-sync')
  , base64 = require('base64-arraybuffer')
  , debug = require('debug')('network')
  // , debug = require('./support/logger')('network')
  , rtc = require('rtc');

module.exports = Network;

function Network(ctx){
  this.context = ctx; // TODO not sure about this...
  this.available = rtc.available;
  this.pathname = null;
  this.game = null; // will refer to the game channel when it's opened
  this.winner = false;
  this.ready = false;
  this.connected = false;
  this.attemptedStart = false;
  this.sync = new TimeSync();
}

Emitter(Network.prototype)

Network.prototype.setupRemote = function(opts){
  debug('setup rtc')
  if( !this.available ){
    return console.warn('RTC not available. Skipping network');
  }

  var network = this
    , ctx = this.context
    , sync = this.sync;

  sync.on('done',function(latency){
    debug('latency',latency)
    ctx.latency = latency;
    network.emit('change latency',latency)
    network.checkReady()
  })

  this.remote = rtc.connect(opts);
  this.remote.on('addstream',function(e){
    network.emit('addstream',e)
    network.checkReady()
  })
  this.remote.on('removestream',function(e){
    network.emit('removestream',e)
    network.checkReady()
  })
  this.remote.on('connected',function(e){
    debug('connected')
    network.connected = true;
    network.winner = this.initiator;
    network.emit('change winner',network.winner)
    debug('challenge winner?',network.winner)

    // send the current state and when
    // the remote current state is received
    // the first time we are officially connected.
    network.emit('state',ctx.pathname)
    network.checkReady()
  })
  this.remote.on('open',function(){
    debug('open')
    network.emit('open')
  })
  this.remote.on('full',function(){
    debug('full')
    network.emit('full')
  })
  this.remote.on('disconnected',function(e){
    debug('disconnected')
    if( network.connected ){
      network.emit('disconnected',e)
    }
    network.close()
  })
  this.remote.on('error',function(e){
    debug('error',e)
    network.emit('error',e)
  })
  this.remote.on('state',function(e){
    console.log('STATE %s -> %s',network.pathname,e.pathname)
    var initial = network.pathname;
    debug('received state %s %s',e.pathname, initial === null ? '(connected)' : '')
    network.pathname = e.pathname;
    network.emit('change pathname',e.pathname)
    if( initial === null ){
      network.emit('connected',e)
      network.checkReady()
    }
  })
  this.remote.on('channel game open',function(e){
    debug('channel game open',e)

    // wrap `this.channels.game` in NetChannel
    // and base64
    network.game = netchan(this.channels.game,network);
    network.game.onmessage = function(msg){
      // debug('message',ab2s(msg)) // too noisy
      if( sync.channel && !sync.onmessage(msg) ){
        network.emit('message',msg)
      }
    }

    // use the game channel for sending time sync
    // requests
    sync.channel = network.game;

    ctx.multiplayer = true;
    network.emit('change multiplayer',true)
  })

  network.on('state',function(pathname){
    if( network.connected ){
      this.remote.signal.send({type:'state',pathname:pathname})
    }
  })

  this.remote.on('addstream',function(){
    console.log('ADD REMOTE STREAM')
  })
  this.remote.on('removestream',function(){
    console.log('REMOVE REMOTE STREAM')
  })
  this.remote.on('timeout',function(){
    console.log('CONNECTION TIMED OUT')
  })
  this.remote.on('open',function(){
    console.log('OPENED')
  })
  this.remote.on('close',function(){
    console.log('CLOSED')
  })
  this.remote.on('full',function(){
    console.log('FULL')
  })
  this.remote.on('connected',function(){
    console.log('\nCONNECTED %s',this.initiator === true ? '(initiator)' : this.initiator === false ? '(not initiator)' : '(error: not challenged)')
  })
  this.remote.on('disconnected',function(){
    console.log('DISCONNECTED\n')
  })
  this.remote.on('channel open',function(e){
    console.log('CHANNEL OPENED')
  })
  this.remote.on('channel close',function(e){
    console.log('CHANNEL CLOSED')
  })
  this.remote.on('error',function(e){
    console.error('ERROR',e.message)
  })
  this.remote.on('reconnect',function(){
    console.log('RECONNECTED')
  })
  this.remote.on('negotiationneeded',function(){
    console.log('NEGOTIATIONNEEDED',this.connection.signalingState)
  })
}

Network.prototype.checkReady = function(){
  console.log('checkReady')
  if(this.ready){
    console.log(' - ready')
    return true;
  }
  if(!this.connected){
    console.log(' - connected')
    return false;
  }
  if(!this.context.latency){
    console.log(' - latency')
    return false;
  }
  if(!this.context.multiplayer){
    console.log(' - multiplayer')
    return false;
  }
  if(this.pathname === null){
    console.log(' - pathname')
    return false;
  }
  if(this.remote.connection.getLocalStreams().length === 0 ){
    console.log(' - local video')
    return false;
  }
  if(this.remote.connection.getRemoteStreams().length === 0 ){
    console.log(' - remote video')
    return false;
  }
  this.ready = true;
  this.emit('ready')
  console.log('READY')
}


Network.prototype.close = function(){
  debug('close')
  if( this.game ){
    this.game.onmessage = null;
    this.game = null;
  }
  this.attemptedStart = false;
  this.connected = false;
  this.context.multiplayer = false;
  this.ready = false;
  this.pathname = null;
  this.winner = false;
  this.sync.stop()
  this.sync.channel = null;
  this.emit('change connected',false)
  this.emit('change multiplayer',false)
}

Network.prototype.send = function(msg){
  debug('send',ab2s(msg))
  if( this.game && this.ready ){
    this.game.send(msg);
  } else {
    console.warn('sending a message too early (game channel not open)')
  }
}

Network.prototype.start = function(){
  debug('start %s',this.winner ? '(winner)' : '')
  this.winner && this.remote.start()
  this.winner && this.sync.start()
}

var NETCHAN_PREFIX = 'ı';

function netchan(channel,network,skipBase64){
  // since data channels don't support binary yet
  // we encode the sent message as base64
  if( !skipBase64 ){
    var _recv = NetChannel.prototype.recv;
    NetChannel.prototype.recv = function(e){
    // var _recv = channel.onmessage;
    // channel.onmessage = function(e){
      // MessageEvent#data is not writable
      // so we create a new one
      if( typeof e.data == 'string' && e.data.indexOf(NETCHAN_PREFIX) === 0 ){
        var m = new MessageEvent('message',{
          data: base64.decode(e.data.slice(NETCHAN_PREFIX.length)),
          origin: e.origin,
          lastEventId: e.lastEventId,
          source: e.source,
          ports: e.ports
        })
        // console.log('netchan recv',new Uint8Array(m.data))
        return _recv.call(this,m);
      } else if( typeof e.data != 'string' ){
        return _recv.call(this,e);

      } else {
        // console.log('netchan recv (skipping, not encoded)')
      }
    }
    // RTCDataChannel is not a public constructor
    // so we take the one from the instance.
    // var DataChannel = channel.constructor;
    // var _send = DataChannel.prototype.send;
    // DataChannel.prototype.send = function(msg){
    var _send = channel.send;
    channel.send = function(msg){
      if( typeof msg != 'string' ){
        // console.log('netchan send',new Uint8Array(msg))
        msg = NETCHAN_PREFIX+base64.encode(msg);
      }
      if( msg.length > 1168 ){
        var err = new Error('message too long: '+msg.length);
        err.code = 1168;
        network.emit('error',err)
        return;
      }
      if( channel.readyState == 'open' ){
        return _send.call(this,msg);
      } else {
        console.warn('tried to send message (%s) on closed channel "%s"',msg,channel.label)
      }
    }
  }
  // return channel;
  return new NetChannel(channel,{ack: true})
}



var join = [].join;
function ab2s(buf){
  return join.call(new Uint8Array(buf));
}