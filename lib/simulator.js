var Physics = require('./sim/physics')
  , PointMass = require('./sim/point-mass')
  , Force = require('./sim/force')
  , Point = require('./sim/point')
  , Actions = require('./actions')
  , settings = require('./settings');

module.exports = Simulator;

function Simulator(world){
  this.name = 'Simulator';
  this.physics = new Physics();
  this.actions = Actions(this);
  this.world = world.reset();
  this.bounds = world.bounds;
  this.renderer = world.renderer;

  // for singleplayer
  this.host = true;
  this.channel = {send: function(msg){
    // console.log('sending singleplayer message',msg)
  }}; 

}
Simulator.prototype = {

  createPuck: function(){
    this.actions.create(Actions.PUCK_CREATE,.5,.5,1);

    // start it off with a push
    var lastPuck = this.world.pucks[this.world.pucks.length - 1]
      , x = Math.sin(Math.random()*Math.PI*2)*40
      , y = Math.cos(Math.random()*Math.PI*2)*40;
    this.actions.create(Actions.PUCK_PUSH, lastPuck.id, x, y)
  },

  createPaddle: function(x,y,w){
    var paddle = new Point(x,y);
    paddle.id = this.world.paddles.length;
    paddle.width = w || .2; // in a fraction of the full width (i.e. width*.2)
    this.world.paddles.push(paddle);
    return paddle;
  },

  create: function(){
    this.game.inputs
      .setElement(this.renderer.canvas)
      // .bind(this.game.inputs.LEFT,'up')
      // .bind(this.game.inputs.R,'r')
      .bind(this.game.inputs.B,'b')
      .bind(this.game.inputs.D,'d');

    // receive messages from peer
    this.channel.onmessage = function(e){
      this.actions.parse(e.data);
        
      // TODO next step is to:
      //      1. Store any actions that occurred since `lastFrame` (the last frame received from the channel)
      //      2. When playing back, include any actions that has occured during that frame.
    }.bind(this)

    this.world.players.a.paddle = this.createPaddle(.5,0); // 0 means "top" (i.e. height*0)
    this.world.players.b.paddle = this.createPaddle(.5,1); // 1 means "bottom" (i.e. height*1)
    this.world.me = this.host ? this.world.players.a : this.world.players.b;

    // only create as host, or it will come as a message
    this.host && this.createPuck();

    // invert the renderer if player is guest
    this.host || this.renderer.invert()
  },

  destroy: function(){
    // clear the canvas...
    this.renderer.canvas.width = this.renderer.canvas.width

    delete this.world.players.me;
  },

  controls: function(inputs){
    if( settings.data.paused ) return;

    if( inputs.pressed('r') ){
      this.actions.create(Actions.REVERSE);
      settings.data.reversed = !settings.data.reversed;
    }

    if( inputs.pressed('d') ){
      this.actions.create(Actions.DEBUG_DIFF);
    }

    // only the host can modify the simulation
    if( this.host ){

      // create pucks
      if( inputs.pressed('b') ){
        this.createPuck();
      }

      // create forces
      if( inputs.pressed('up') ){ 
        if( Math.random() > .5 )
          this.actions.create(Actions.FORCE_ATTRACT,inputs.mouse.x,inputs.mouse.y);
        else
          this.actions.create(Actions.FORCE_REPELL,inputs.mouse.x,inputs.mouse.y);
      }

    }


    // paddle is controlled by motion or mouse
    if( settings.data.inputType == "motion" && inputs.motion.moved ){
      this.actions.create(Actions.PADDLE_MOVE,this.world.me.paddle.id,inputs.motion.x);

    } else if( settings.data.inputType == "mouse" && inputs.mouse.moved ){
      this.actions.create(Actions.PADDLE_MOVE,this.world.me.paddle.id,inputs.mouse.x);

    }

    // add the video texture to the renderer
    if( inputs.remoteVideo ){
      this.renderer.setVideoTexture(inputs.remoteVideo);
      delete inputs.remoteVideo; // remove when we have it
    }

    // send any actions to the peer
    this.actions.flush(this.channel);
  },
  
  update: function(dt,t){
    if( settings.data.paused ) return;

    // update arena size settings
    this.bounds.r = settings.data.arenaWidth - this.bounds.l;
    this.bounds.b = settings.data.arenaHeight - this.bounds.t;

    this.physics.update(this.world, dt, t);
  },

  render: function(alpha){
    this.renderer.render(this.world, alpha)
  }

}
