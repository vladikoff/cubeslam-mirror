var Game = require('./game')
  , Simulator = require('./simulator')
  , assert = require('assert');

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
    this.host.host = true;
    this.host.channel = hostChannel;
    this.host.create()

    this.guest = new Simulator(document.getElementById('guest'),document.getElementById('guest-form'))
    this.guest.host = false;
    this.guest.channel = guestChannel;
    this.guest.create()

    assertSim = function(){
      assert(this.host.width === this.guest.width)
      assert(this.host.height === this.guest.height)
      assert(this.host.physics.frame === this.guest.physics.frame,
        'frames does not match: '+this.host.physics.frame+' !== '+this.guest.physics.frame)
      assert(this.host.physics.direction === this.guest.physics.direction,
        'direction does not match: '+this.host.physics.direction+' !== '+this.guest.physics.direction)
      assert(this.host.forces[0].toString() === this.guest.forces[0].toString(),
        'forces does not match: '+this.host.forces[0].toString()+' !== '+this.guest.forces[0].toString())
      assert(this.host.puck.current.toString() === this.guest.puck.current.toString(),
        'puck current position does not match:'+this.host.puck.current.toString()+' !== '+this.guest.puck.current.toString())
      assert(this.host.puck.previous.toString() === this.guest.puck.previous.toString(),
        'puck previous position does not match:'+this.host.puck.previous.toString()+' !== '+this.guest.puck.previous.toString())
    }.bind(this)
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
  render: function(alpha){
    this.host.render(alpha)
    this.guest.render(alpha)
  }
}

module.exports = function(){
  new Game()
    .pushState(PlayState)
    .run()
}