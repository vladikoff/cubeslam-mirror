var Emitter = require('emitter')
  , NetChannel = require('netchan')
  , base64 = require('base64-arraybuffer')
  , debug = require('debug')('network')
  , rtc = require('./rtc');

module.exports = Network;


function Network(ctx){
  this.context = ctx; // TODO not sure about this...
  this.pathname = null;
  this.game = null; // will refer to the game channel when it's opened
  this.available = rtc.available;
  this.setupRemote({
    url: 'ws://nj.publicclass.co:8081/'+ctx.room,
    dataChannels: ['game']
  })
}

Emitter(Network.prototype)

Network.prototype.setupRemote = function(opts){
  debug('setup rtc')
  if( !this.available )
    return console.warn('RTC not available. Skipping network');

  var network = this
    , ctx = this.context;
  this.remote = rtc.connect(opts);
  this.remote.on('addstream',this.emit.bind(this,'addstream'))
  this.remote.on('removestream',this.emit.bind(this,'removestream'))
  this.remote.on('connected',function(e){ // a peer has joined
    debug('connected')
    network.connected = true;
    network.emit('change connected',true)
    network.challenge = Math.random();
    this.signal.send({type:'challenge',challenge:network.challenge})

    // wrap `this.channels.game` in NetChannel
    // and base64
    network.game = netchan(this.channels.game);
    network.game.onmessage = function(msg){
      debug('message',new Uint8Array(msg))
      network.emit('message',msg)
    }
    network.game.onlatency = function(latency){
      console.log('got latency estimate!',latency)
      ctx.latency = latency;
      network.emit('change latency',this.latency)
    }
  })
  this.remote.on('challenge',function(e){
    debug('challenge (mine: %s, theirs: %s)',network.challenge,e.challenge)
    if( network.challenge ){
      network.winner = e.challenge < network.challenge;
      network.emit('change winner',network.winner)
      ctx.multiplayer = true;
      network.emit('change multiplayer',true)
      network.emit('connected',e)
      debug('challenge winner?',network.winner)
    } else {
      console.warn('challenge not set, not connected?')
    }
  })
  this.remote.on('open',function(e){
    debug('open')
    // peer-to-peer connected
    network.emit('open',e)
  })
  this.remote.on('disconnected',function(e){
    debug('disconnected')
    network.game.open = false
    network.connected = false;
    network.emit('change connected',false)
    ctx.multiplayer = false;
    network.emit('change multiplayer',false)
    network.emit('disconnected',e)
  })
  this.remote.on('state',function(e){
    debug('received state',e.pathname)
    network.pathname = e.pathname;
    network.emit('change pathname',e.pathname)
  })
  this.remote.on('channel game open',function(e){
    debug('channel game open',e)
    network.game.open = true;

    // TODO force send a few packets so we can get our first
    // latency estimate before the "ready" event
    if( !network.ready ){
      network.ready = true;
      network.emit('ready')
    }
  })

  network.on('state',function(pathname){
    if( this.connected )
      this.remote.signal.send({type:'state',pathname:pathname})
  })
}

Network.prototype.send = function(msg){
  debug('send',new Uint8Array(msg))
  if( this.game && this.game.open )
    this.game.send(msg);
  else
    console.warn('sending a message too early (game channel not open)')
}

Network.prototype.start = function(){
  debug('start')
  if( this.winner ){
    // winner gets to send the first offer!
    this.remote.start()
  }
}

var NETCHAN_PREFIX = 'ı';

function netchan(channel,skipBase64){
  // since data channels don't support binary yet
  // we encode the sent message as base64
  if( !skipBase64 ){
    var _recv = NetChannel.prototype.recv;
    NetChannel.prototype.recv = function(e){
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
    var DataChannel = channel.constructor;
    var _send = DataChannel.prototype.send;
    DataChannel.prototype.send = function(msg){
      if( typeof msg != 'string' ){
        // console.log('netchan send',new Uint8Array(msg))
        msg = NETCHAN_PREFIX+base64.encode(msg);
      }
      if( msg.length > 1168 ){
        console.error('message too long: %s',msg.length)
        // TODO fragment?
        return;
      }
      return _send.call(this,msg);
    }
  }
  return new NetChannel(channel)
}