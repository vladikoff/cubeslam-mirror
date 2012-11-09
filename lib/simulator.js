var Physics = require('./sim/physics')
  , PointMass = require('./sim/point-mass')
  , Force = require('./sim/force')
  , Point = require('./sim/point')
  , actions = require('./actions')
  , world = require('./world')
  , settings = require('./settings');

module.exports = Simulator;

function Simulator(world){
  this.name = 'Simulator';
  this.physics = new Physics();
  this.world = world.reset();
  this.bounds = world.bounds;
  this.renderer = world.renderer;

  // for singleplayer we default to being "the host"
  this.host = true;
  this.channel = {send: function(msg){
    // console.log('sending singleplayer message',msg)
  }}; 

}
Simulator.prototype = {

  createPuck: function(){
    actions.puckCreate(.5,.5,1);

    // start it off with a push
    var lastPuck = world.pucks[world.pucks.length - 1]
      , x = Math.sin(Math.random()*Math.PI*2)*40
      , y = Math.cos(Math.random()*Math.PI*2)*40;

    actions.puckPush(lastPuck.id, 30, -40)
  },

  createPaddle: function(x,y,w){
    var paddle = new Point(x,y);
    paddle.id = world.paddles.length;
    paddle.width = w || .2; // in a fraction of the full width (i.e. width*.2)
    world.paddles.push(paddle);
    return paddle;
  },

  create: function(){
    this.game.inputs
      .setElement(this.renderer.canvas)
      // .bind(this.game.inputs.LEFT,'up')
      .bind(this.game.inputs.B,'b')
      .bind(this.game.inputs.D,'d');

    // receive messages from peer
    this.channel.onmessage = function(e){
      console.log('channel onmessage',e)

      // scope to `this` because `createAt` needs physics...
      actions.parse.call(this,e.data);
        
      // TODO next step is to:
      //      1. Store any actions that occurred since `lastFrame` (the last frame received from the channel)
      //      2. When playing back, include any actions that has occured during that frame.
    }.bind(this)

    world.host = this.host;

    world.players.a.paddle = this.createPaddle(.5,1); // 0 means "top" (i.e. height*0)
    world.players.b.paddle = this.createPaddle(.5,0); // 1 means "bottom" (i.e. height*1)
    world.me = world.host ? world.players.a : world.players.b;

    // only create as host, or it will come as a message
    world.host && this.createPuck();

    // invert the renderer if player is guest
    world.host || this.renderer.invert()
  },

  destroy: function(){
    // clear the canvas...
    this.renderer.canvas.width = this.renderer.canvas.width

    delete world.players.me;
    delete world.host;
  },

  controls: function(inputs){
    if( settings.data.paused ) return;

    if( inputs.pressed('d') ){
      actions.debugDiff();
    }

    // only the host can modify the simulation
    if( world.host ){

      // create pucks
      if( inputs.pressed('b') ){
        this.createPuck();
      }

      // create forces
      if( inputs.pressed('up') ){ 
        if( Math.random() > .5 )
          actions.forceAttract(inputs.mouse.x,inputs.mouse.y);
        else
          actions.forceRepell(inputs.mouse.x,inputs.mouse.y);
      }

    }


    // paddle is controlled by motion or mouse
    if( settings.data.inputType == "motion" && inputs.motion.moved ){
      actions.paddleMove(world.me.paddle.id,inputs.motion.x);

    } else if( settings.data.inputType == "mouse" && inputs.mouse.moved ){
      actions.paddleMove(world.me.paddle.id,inputs.mouse.x);

    }

    // add the video texture to the renderer
    if( inputs.remoteVideo ){
      this.renderer.setVideoTexture(inputs.remoteVideo);
      delete inputs.remoteVideo; // remove when we have it
    }

    // send any actions to the peer
    actions.flush(this.channel);
  },
  
  update: function(dt,t){
    if( settings.data.paused ) return;

    // update arena size settings
    this.bounds.r = settings.data.arenaWidth - this.bounds.l;
    this.bounds.b = settings.data.arenaHeight - this.bounds.t;

    this.physics.update(world, dt, t);
  },

  render: function(alpha){
    this.renderer.render(world, alpha)
  }

}
