var Game = require('./game')
  , Simulator = require('./simulator')
  , assert = require('assert')
  , inspect = require('./inspect')
  , diff = require('./diff');

function Channel(receiver){
  this.receiver = receiver;
  this.latency = 100;
  this.onmessage = function(){}; // override
  this.send = function(msg){
    var jitter = -5+Math.random()*10;
    var lag = this.latency+jitter;
    console.log('send(in %dms)',lag,msg)
    setTimeout(function(){
      this.receiver.onmessage(msg)
    }.bind(this),lag);
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

    diffSim = function(name){
      console.log(diff.createPatch(name,i(this.host),i(this.guest),'host','guest'))
    }.bind(this)

    function i(obj){
      // temporary remove things that always will be different 
      // so to not mess up the snapshot
      var r = obj.renderer;
      var f = obj.form;
      var h = obj.host;
      delete obj.renderer;
      delete obj.form;
      delete obj.host;
      var snap = inspect(obj);
      obj.renderer = r;
      obj.form = f;
      obj.host = h;
      return snap;
    }

    assertSim = function(){
      assert(this.host.width === this.guest.width)
      assert(this.host.height === this.guest.height)

      assert(this.host.physics.constraintAccuracy === this.guest.physics.constraintAccuracy,
        'constraintAccuracy does not match: '+this.host.physics.constraintAccuracy+' !== '+this.guest.physics.constraintAccuracy)
      assert(this.host.physics.frame === this.guest.physics.frame,
        'frames does not match: '+this.host.physics.frame+' !== '+this.guest.physics.frame)
      assert(this.host.physics.direction === this.guest.physics.direction,
        'direction does not match: '+this.host.physics.direction+' !== '+this.guest.physics.direction)
      
      assert(this.host.forces.length === this.guest.forces.length)
      for(var f=0; f < this.host.forces.length; f++ ){
        if(this.host.forces[f].toString() !== this.guest.forces[f].toString())
          console.error('forces does not match: '+this.host.forces[f].toString()+' !== '+this.guest.forces[f].toString())
      }

      assert(this.host.pointMasses.length === this.guest.pointMasses.length)
      for(var p=0; p < this.host.pointMasses.length; p++ ){
        if(this.host.pointMasses[p].current.toString() !== this.guest.pointMasses[p].current.toString())
          console.error('pointMass current position does not match:'+this.host.pointMasses[p].current.toString()+' !== '+this.guest.pointMasses[p].current.toString())
        if(this.host.pointMasses[p].previous.toString() !== this.guest.pointMasses[p].previous.toString())
          console.error('pointMass previous position does not match:'+this.host.pointMasses[p].previous.toString()+' !== '+this.guest.pointMasses[p].previous.toString())
        if(this.host.pointMasses[p].velocity.toString() !== this.guest.pointMasses[p].velocity.toString())
          console.error('pointMass velocity does not match:'+this.host.pointMasses[p].velocity.toString()+' !== '+this.guest.pointMasses[p].velocity.toString())
        if(this.host.pointMasses[p].acceleration.toString() !== this.guest.pointMasses[p].acceleration.toString())
          console.error('pointMass acceleration does not match:'+this.host.pointMasses[p].acceleration.toString()+' !== '+this.guest.pointMasses[p].acceleration.toString())
      }
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