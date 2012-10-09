var Game = require('./game')
  , Simulator = require('./simulator');

function Channel(receiver){
  this.receiver = receiver;
  this.latency = 100;
  this.onmessage = function(){}; // override
  this.send = function(msg){
    var jitter = -5+Math.random()*10;
    setTimeout(function(){
      this.receiver.onmessage(msg)
    }.bind(this),this.latency+jitter);
  }.bind(this)
}

var PlayState = {
  create: function(){
    var hostChannel = new Channel()
    var guestChannel = new Channel()
    hostChannel.receiver = guestChannel;
    guestChannel.receiver = hostChannel;

    this.host = new Simulator(document.getElementById('host'),document.getElementById('host-form'))
    this.host.channel = hostChannel;
    this.host.create()

    this.guest = new Simulator(document.getElementById('guest'),document.getElementById('guest-form'))
    this.guest.channel = guestChannel;
    this.guest.create()
  },
  destroy: function(){
    this.host.destroy()
    this.guest.destroy()
    delete this.host
    delete this.guest
  },
  controls: function(inputs){
    this.host.controls(inputs)
    this.guest.controls(inputs)
  },
  update: function(dt,t){
    this.host.update(dt,t)
    this.guest.update(dt,t)
  },
  render: function(){
    this.host.render()
    this.guest.render()
  }
}

new Game()
  .pushState(PlayState)
  .run()