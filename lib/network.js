var Emitter = require('emitter')
  , NetChannel = require('netchan')
  , TimeSync = require('./support/time-sync')
  , base64 = require('base64-arraybuffer')
  , debug = require('debug')('network')
  // , debug = require('./support/logger')('network')
  , rtc = require('./rtc');

module.exports = Network;

function Network(ctx){
  this.context = ctx; // TODO not sure about this...
  this.pathname = null;
  this.game = null; // will refer to the game channel when it's opened
  this.available = rtc.available;
  this.winner = false;

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
    , ctx = this.context
    , now = Date.now()
    , sync = new TimeSync();

  sync.on('complete',function(){
    debug('latency',this.latency)
    ctx.latency = this.latency;
    network.emit('change latency',this.latency)
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

    // use the game channel for sending time sync
    // requests
    // sync.channel = this.channels.game;
    // sync.channel.addEventListener('message',function(e){
    //   sync.onmessage(e);
    // })

    // wrap `this.channels.game` in NetChannel
    // and base64
    network.game = this.channels.game;
    network.game.onmessage = function(msg){

      debug('message',ab2s(msg))
      network.emit('message',msg)
    }
    // network.game.onlatency = function(latency){
    //   console.log('got latency estimate!',latency)
    //   ctx.latency = latency;
    //   network.emit('change latency',this.latency)
    // }
    netchan(network.game)
  })
  this.remote.on('challenge',function(e){
    debug('challenge (mine: %s, theirs: %s)',network.challenge,e.challenge)
    if( network.challenge ){
      network.winner = e.challenge > network.challenge;
      network.emit('change winner',network.winner)
      debug('challenge winner?',network.winner)

      // finally done, emit "connected"
      network.emit('connected',e)
      network.emit('state',ctx.pathname)
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
    if( network.game )
      network.game.open = false
    network.connected = false;
    network.ready = false;
    network.pathname = null;
    this.reconnect();
    network.emit('change connected',false)
    ctx.multiplayer = false;
    network.emit('change multiplayer',false)
    network.emit('disconnected',e)
  })
  this.remote.on('error',function(e){
    network.emit('error',e)
  })
  this.remote.on('state',function(e){
    var initial = network.pathname;
    debug('received state',e.pathname, 'recently connected:', initial)
    network.pathname = e.pathname;
    network.emit('change pathname',e.pathname)
    if(initial===null)
      network.emit('connected',e)
  })
  this.remote.on('channel game open',function(e){
    debug('channel game open',e)
    network.game.open = true;

    // TODO this should probably be in "open" but
    // it seems we don't get that event anymore.
    // could have been changed to "active" perhaps?
    // there seems to be uncertainty in the spec.
    ctx.multiplayer = true;
    network.emit('change multiplayer',true)

    // get the initial latency over the data channel
    // sync.start(network.winner)

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
  debug('send',ab2s(msg))
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
    // var _recv = NetChannel.prototype.recv;
    // NetChannel.prototype.recv = function(e){
    var _recv = channel.onmessage;
    channel.onmessage = function(e){
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
        return _recv.call(this,m.data);
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
        console.error('message too long: %s',msg.length)
        // TODO fragment?
        return;
      }
      return _send.call(this,msg);
    }
    // to match NetChannel prototype
    channel.flush = function(){}
  }
  return channel;
  // return new NetChannel(channel)
}



var join = [].join;
function ab2s(buf){
  return join.call(new Uint8Array(buf));
}