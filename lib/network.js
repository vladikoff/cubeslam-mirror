var Emitter = require('emitter')
  , rtc = require('./rtc')
  , cookie = require('cookie')
  , $ = require('jquery');

module.exports = Network;

function Network(ctx){
  this.context = ctx; // TODO not sure about this...
  this.pathname = null;
  this.requestToken(ctx.roomName)
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

Network.prototype.setupRemote = function(token, roomName, clientId){
  var network = this;
  this.remote = rtc.connect(token,roomName,clientId);
  this.remote.on('full',this.emit.bind(this,'full'))
  this.remote.on('addstream',this.emit.bind(this,'addstream'))
  this.remote.on('removestream',this.emit.bind(this,'removestream'))
  this.remote.on('datachannel',this.emit.bind(this,'datachannel'))
  this.remote.on('open',function(e){
    // TODO start TimeSync and keep ctx.latency updated (emit events when changed)
    network.context.multiplayer = true;
    network.emit('change multiplayer',true)
    network.emit('open',e)
  })
  this.remote.on('disconnect',function(e){
    // TODO store the game input history in case of reconnect?
    network.context.multiplayer = false;
    network.emit('change multiplayer',false)
    network.emit('disconnect',e)
  })
  this.remote.on('promoted',function(e){
    network.context.host = true;
    network.emit('change host',true)
    network.emit('promoted',e)
  })
  this.remote.on('demoted',function(e){
    network.context.host = false;
    network.emit('change host',false)
    network.emit('promoted',e)
  })
  this.remote.on('state',function(pathname){
    network.pathname = pathname;
    network.emit('change pathname',pathname)
  })
  this.on('state',this.remote.socket.emit.bind(this.remote.socket,'state'))
  this.emit('state',this.context.pathname);
}
