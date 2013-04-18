var Emitter = require('emitter')
  , NetChannel = require('netchan')
  , TimeSync = require('./support/time-sync')
  , base64 = require('base64-arraybuffer')
  , debug = require('debug')('network')
  // , debug = require('./support/logger')('network')
  , rtc = require('./rtc');

module.exports = Network;

function Network(ctx, overideAvailable){
  this.context = ctx; // TODO not sure about this...
  this.available = rtc.available;
  this.pathname = null;
  this.game = null; // will refer to the game channel when it's opened
  this.winner = false;
  this.ready = false;
  this.connected = false;
  this.challenge = null;
  this.challenged = false;
  this.attemptedStart = false;
  this.sync = new TimeSync();

  if( typeof overideAvailable != 'undefined' ) 
      this.available = overideAvailable;

  this.setupRemote({
    dataChannels: ['game'],
    bufferCandidates: ctx.query.buffer || ctx.dev,
    signal: ctx.query.signal,

    // options for WebSocketSignal
    url: 'ws://nj.publicclass.co:8081/'+ctx.room,

    // options for AppChannelSignal
    token: ctx.token,
    user: ctx.user,
    room: ctx.room
  })
}

Emitter(Network.prototype)

Network.prototype.setupRemote = function(opts){
  debug('setup rtc')
  if( !this.available ){
    return console.warn('RTC not available. Skipping network');
  }

  var network = this
    , ctx = this.context
    , now = Date.now()
    , sync = this.sync;

  sync.on('done',function(latency){
    debug('latency',latency)
    ctx.latency = latency;
    network.emit('change latency',latency)

    // ok, we're ready!
    if( !network.ready ){
      network.ready = true;
      network.emit('ready')
    }
  })

  this.remote = rtc.connect(opts);
  this.remote.on('addstream',this.emit.bind(this,'addstream'))
  this.remote.on('removestream',this.emit.bind(this,'removestream'))
  this.remote.on('connected',function(e){ // a peer has joined
    debug('connected')
    network.connected = true;
    network.emit('change connected',true)
    network.challenge = now + Math.random()
    this.signal.send({type:'challenge',challenge:network.challenge})

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
  })
  this.remote.on('challenge request',function(e){
    this.signal.send({type:'challenge',challenge:network.challenge})
  })
  this.remote.on('challenge',function(e){
    debug('challenge (mine: %s, theirs: %s)',network.challenge,e.challenge)
    if( network.challenge ){
      network.challenged = true;
      network.winner = e.challenge > network.challenge;
      network.emit('change winner',network.winner)
      debug('challenge winner?',network.winner)

      // send the current state and when
      // the remote current state is received
      // the first time we are officially connected.
      network.emit('state',ctx.pathname)

      // if previously attempted a start try again now
      // that we're successfully challenged
      // TODO hmm this is backwards. the challenge is sent
      // from the one who needs one
      network.attemptedStart && network.start();
    } else {
      console.warn('challenge not set, not connected?')
    }
  })
  this.remote.on('open',function(e){
    debug('open')
    network.emit('open',e)
  })
  this.remote.on('full',function(){
    debug('full')
    network.emit('full')
  })
  this.remote.on('disconnected',function(e){
    debug('disconnected')
    network.emit('disconnected',e)
    network.close()
    this.reconnect();
  })
  this.remote.on('error',function(e){
    debug('error',e)
    network.emit('error',e)
  })
  this.remote.on('state',function(e){
    var initial = network.pathname;
    debug('received state %s %s',e.pathname, initial === null ? '(connected)' : '')
    network.pathname = e.pathname;
    network.emit('change pathname',e.pathname)
    if( initial === null ){
      network.emit('connected',e)
    }
  })
  this.remote.on('channel game open',function(e){
    debug('channel game open',e)

    ctx.multiplayer = true;
    network.emit('change multiplayer',true)

    // get the initial latency over the data channel
    network.winner && sync.start()
  })

  network.on('state',function(pathname){
    if( this.connected ){
      this.remote.signal.send({type:'state',pathname:pathname})
    }
  })
}

Network.prototype.close = function(){
  debug('close')
  if( this.remote ){
    this.remote.reconnect()
  }
  if( this.game ){
    this.game.onmessage = null;
    this.game = null;
  }
  this.connected = false;
  this.challenged = false;
  this.attemptedStart = false;
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

  if( !this.challenged && this.challenge ){
    this.attemptedStart = true;
    this.remote.signal.send({type:'challenge request'})
  }

  // winner gets to send the first offer!
  this.winner && this.remote.start()
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
      if( typeof e.data == 'string' && e.data.indexOf(NETCHAN_PREFIX) == 0 ){
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