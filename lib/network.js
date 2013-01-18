var Emitter = require('emitter')
  , rtc = require('./rtc')
  , cookie = require('cookie')
  , $ = require('jquery');

module.exports = Network;

function Network(ctx){
  this.context = ctx; // TODO not sure about this...
  this.pathname = null;
  // this.requestToken(ctx.roomName)
  this.setupRemote({
    url: 'ws://nj.publicclass.co:8081/eyo',
    dataChannels: ['game','latency']
  })
}

Emitter(Network.prototype)

Network.prototype.requestToken = function(roomName){
  var network = this;
  $.ajax({
    url: "/channeltoken/" + (new Date()).getTime(),
    type: "POST",
    data: {
      roomName: roomName,
      clientId: cookie("clientId")
    },
    dataType: "json",
    error: function() {
      console.error(arguments)
      alert("Out of Google Channel API quotas?");
    },
    success: function(data){
      network.setupRemote(data.token,roomName,cookie("clientId"));
    }
  })
}

Network.prototype.setupRemote = function(opts){
  var network = this;
  this.remote = rtc.connect(opts);
  this.remote.on('addstream',this.emit.bind(this,'addstream'))
  this.remote.on('removestream',this.emit.bind(this,'removestream'))
  this.remote.on('connected',function(e){ // a peer has joined
    network.on('state',function(pathname){
      network.remote.signal.send({type:'state',pathname:pathname})
    })
    network.emit('state',network.context.pathname);
  })
  this.remote.on('challenge',function(e){
    network.winner = e.challenge < this.challenge;
    network.emit('change winner',network.winner)
    network.context.multiplayer = true;
    network.emit('change multiplayer',true)
    network.emit('connected',e)
    if( network.winner )
      this.start()
  })
  this.remote.on('open',function(e){
    // peer-to-peer connected
    network.emit('open',e)
  })
  this.remote.on('disconnected',function(e){
    network.context.multiplayer = false;
    network.emit('change multiplayer',false)
    network.emit('disconnected',e)
  })
  this.remote.on('state',function(e){
    network.pathname = e.pathname;
    network.emit('change pathname',e.pathname)
  })
  var timeSync = new TimeSync()
  this.remote.on('latency open',function(){
    timeSync.start();
    this.send('latency','ping')
    // TODO start TimeSync and keep ctx.latency updated
    //      (emit "change latency"-events when changed)
  })
  this.remote.on('latency message',function(e){
    if( e.data == 'ping' )
      this.send('latency','pong')
    else
      this.
  })
  this.remove.on('game open',function(){
    this.send('game','whattup?')
  })
}

Network.prototype.start = function(){
  this.challenge = Math.random();
  this.signal.send({type:'challenge',challenge:this.challenge})
}