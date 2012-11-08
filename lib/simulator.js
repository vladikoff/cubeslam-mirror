var Physics = require('./sim/physics')
  , PointMass = require('./sim/point-mass')
  , Force = require('./sim/force')
  , Point = require('./sim/point')
  , Rect = require('./sim/rect')
  , Renderer = require('./renderer-2d')
  , Actions = require('./actions')
  , settings = require('./settings');

module.exports = Simulator;

//var renderer = null;

function Simulator(canvas,form){
  this.name = 'Simulator';
  this.form = form;
  this.world = {}
  this.bounds = new Rect(0,settings.data.arenaWidth,settings.data.arenaHeight,0);
  this.physics = new Physics();
  this.renderer = new Renderer(canvas,this.bounds,this.world);
  this.actions = Actions(this);

  // for singleplayer
  this.host = true;
  this.channel = {send: function(msg){
    // console.log('sending singleplayer message',msg)
  }}; 

}

// default player object
function Player(name){
  this.name = name
  this.host = false
  this.score = 0
  this.paddle = null // should be an index in `this.world.paddles`
  this.power = 1 // multiplyer for hitting the ball (> 1 = speedup, < 1 = slow down)
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
    paddle.width = w || .2; // in a fraction of the full width (i.e. width*.2)
    this.world.paddles.push(paddle);
    return paddle;
  },

  create: function(){
    this.world = {
      frame: 0,
      direction: 1, // physics direction (forward/reverse = 1/-1)
      pucks: [],
      forces: [],
      paddles: [],
      alive: 0,
      players: {
        a: new Player('HAL'),
        b: new Player('EVE')
      }
    }

    this.game.inputs
      .setElement(this.renderer.canvas)
      // .bind(this.game.inputs.LEFT,'up')
      // .bind(this.game.inputs.R,'r')
      .bind(this.game.inputs.B,'b')
      .bind(this.game.inputs.D,'d');

    // highlight "me"
    if( this.host )
      this.form.hostScore.parentNode.style.border = 'solid 3px green';
    else 
      this.form.guestScore.parentNode.style.border = 'solid 3px green';

    // receive messages from peer
    this.channel.onmessage = function(e){
      this.actions.parse(e.data);
        
      // TODO next step is to:
      //      1. Store any actions that occurred since `lastFrame` (the last frame received from the channel)
      //      2. When playing back, include any actions that has occured during that frame.
    }.bind(this)

    this.world.players.a.paddle = this.createPaddle(.5,0); // 0 means "top" (i.e. height*0)
    this.world.players.b.paddle = this.createPaddle(.5,1); // 1 means "bottom" (i.e. height*1)

    // only create as host, or it will come as a message
    this.host && this.createPuck();

    // invert the renderer if player is guest
    this.host || this.renderer.invert()
  },

  destroy: function(){
    this.form.hostScore.parentNode.style.border = 'none'
    this.form.guestScore.parentNode.style.border = 'none'
    this.form.reset()

    // clear the canvas...
    this.renderer.canvas.width = this.renderer.canvas.width

    delete this.world
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
    var paddleIndex = this.host ? 0 : 1;
    if( settings.data.inputType == "motion" && inputs.motion.moved ){
      this.actions.create(Actions.PADDLE_MOVE,paddleIndex,inputs.motion.x);

    } else if( settings.data.inputType == "mouse" && inputs.mouse.moved ){
      this.actions.create(Actions.PADDLE_MOVE,paddleIndex,inputs.mouse.x);

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

    // update the form
    this.form.hostScore.valueAsNumber = this.world.players.a.score;
    this.form.guestScore.valueAsNumber = this.world.players.b.score;
    this.form.aliveScore.valueAsNumber = this.world.alive;

    this.renderer.render(this.world, alpha)
  }

}

