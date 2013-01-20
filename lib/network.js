var Emitter = require('emitter')
  , debug = require('debug')('network')
  , rtc = require('./rtc');

module.exports = Network;

function Network(ctx){
  this.context = ctx; // TODO not sure about this...
  this.pathname = null;
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
    debug('state')
    network.pathname = e.pathname;
    network.emit('change pathname',e.pathname)
  })
  this.remote.on('channel message',function(e){
    debug('channel message',e.data)
  })
  this.remote.on('channel latency open',function(e){
    // TODO start TimeSync and keep ctx.latency updated
    //      (emit "change latency"-events when changed)
  })
  this.remote.on('channel game open',function(e){
    debug('channel game open',e)
    this.send('game', 'whattup?')
  })

  network.on('state',function(pathname){
    if( this.connected )
      this.remote.signal.send({type:'state',pathname:pathname})
  })
}

Network.prototype.start = function(){
  debug('start')
  if( this.winner ){
    // winner gets to send the first offer!
    this.remote.start()
  }
}