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
  this.setupRemote({
    url: 'ws://nj.publicclass.co:8081/'+ctx.room,
    dataChannels: ['game','latency']
  })
}

Emitter(Network.prototype)

Network.prototype.setupRemote = function(opts){
  debug('setup rtc')
  var network = this;
  this.remote = rtc.connect(opts);
  this.remote.on('addstream',this.emit.bind(this,'addstream'))
  this.remote.on('removestream',this.emit.bind(this,'removestream'))
  this.remote.on('connected',function(e){ // a peer has joined
    debug('connected')
    network.connected = true;
    network.emit('change connected',true)
    network.challenge = Math.random();
    this.signal.send({type:'challenge',challenge:network.challenge})
  })
  this.remote.on('challenge',function(e){
    debug('challenge (mine: %s, theirs: %s)',network.challenge,e.challenge)
    if( network.challenge ){
      network.winner = e.challenge < network.challenge;
      network.emit('change winner',network.winner)
      network.context.multiplayer = true;
      network.emit('change multiplayer',true)
      network.emit('connected',e)
      debug('challenge winner?',network.winner)
    } else {
      // waiting for this peer to "start" too
      debug('challenge not set, waiting for start')
    }
  })
  this.remote.on('open',function(e){
    debug('open')
    // peer-to-peer connected
    network.emit('open',e)
  })
  this.remote.on('disconnected',function(e){
    debug('disconnected')
    network.connected = false;
    network.emit('change connected',false)
    network.context.multiplayer = false;
    network.emit('change multiplayer',false)
    network.emit('disconnected',e)
  })
  this.remote.on('state',function(e){
    debug('received state',e.pathname)
    network.pathname = e.pathname;
    network.emit('change pathname',e.pathname)
  })
  this.remote.on('channel message',function(e){
    // debug('channel message',e.data)
  })
  this.remote.on('channel latency open',function(e){
    // TODO start TimeSync and keep ctx.latency updated
    //      (emit "change latency"-events when changed)
  })
  this.remote.on('channel game open',function(e){
    // TODO wrap `this.channels.game` in NetChannel
    // and base64
    network.game = netchan(this.channels.game);
    network.game.onmessage = function(msg){
      debug('message',new Uint8Array(msg))
      network.emit('message',msg)
    }

    debug('channel game open',e)
    network.send(new Uint8Array([network.winner ? 1 : 0]))
  })

  network.on('state',function(pathname){
    if( this.connected )
      this.remote.signal.send({type:'state',pathname:pathname})
  })
}

Network.prototype.send = function(msg){
  debug('send',msg)
  if( this.game )
    this.game.send(msg);
}

Network.prototype.start = function(){
  debug('start')
  if( this.winner ){
    // winner gets to send the first offer!
    this.remote.start()
  }
}

function netchan(channel,skipBase64){
  // since data channels don't support binary yet
  // we encode the sent message as base64
  if( !skipBase64 ){
    var _recv = NetChannel.prototype.recv;
    NetChannel.prototype.recv = function(e){
      // MessageEvent#data is not writable
      // so we create a new one
      var m = new MessageEvent('message',{
        data: base64.decode(e.data),
        origin: e.origin,
        lastEventId: e.lastEventId,
        source: e.source,
        ports: e.ports
      })
      console.log('netchan recv',new Uint8Array(m.data))
      return _recv.call(this,m);
    }
    // RTCDataChannel is not a public constructor
    // so we take the one from the instance.
    var DataChannel = channel.constructor;
    var _send = DataChannel.prototype.send;
    DataChannel.prototype.send = function(msg){
      console.log('netchan send',new Uint8Array(msg))
      if( typeof msg != 'string' )
        msg = base64.encode(msg);
      return _send.call(this,msg);
    }
  }
  return new NetChannel(channel)
}