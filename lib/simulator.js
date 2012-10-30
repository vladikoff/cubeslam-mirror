var Physics = require('./sim/physics')
  , PointMass = require('./sim/point-mass')
  , Force = require('./sim/force')
  , Point = require('./sim/point')
  , Rect = require('./sim/rect')
  , Renderer = require('./renderer-3d')
  , Actions = require('./actions')
  , settings = require('./settings');

module.exports = Simulator;

function Simulator(canvas,form){
  this.form = form;
  this.bounds = new Rect(0,settings.data.arenaWidth,settings.data.arenaHeight,0);
  this.physics = new Physics();
  this.renderer = new Renderer(canvas,this.bounds);
  this.actions = Actions(this);

  // for singleplayer
  this.host = true;
  this.channel = {send: function(){}}; 
}

Simulator.prototype = {

  createPuck: function(){
    this.actions.create(Actions.PUCK,.5,.5,1);
  },

  createPaddle: function(y){
    var paddle = new Point(.5,y);
    paddle.width = .2; // in a fraction of the full width (i.e. width*.2)
    this.paddles.push(paddle);
  },

  create: function(){
    this.pointMasses = 
      this.physics.pointMasses = 
      this.renderer.pointMasses = [];

    this.forces = 
      this.physics.forces =
      this.renderer.forces = [];

    this.paddles = 
      this.physics.paddles = 
      this.renderer.paddles = [];

    this.reversed = settings.data.reverse;

    this.game.inputs.setElement(this.renderer.canvas);
    this.game.inputs.bind(this.game.inputs.LEFT,'up');
    this.game.inputs.bind(this.game.inputs.B,'b');
    this.game.inputs.bind(this.game.inputs.D,'d');

    // highlight "me"
    if( this.host )
      this.form.hostScore.parentNode.style.border = 'solid 3px green';
    else 
      this.form.guestScore.parentNode.style.border = 'solid 3px green';

    if( this.channel ){
      this.channel.onmessage = function(e){
        var msg = e.data;
        // console.log('onmessage',msg,this.physics.frame)

        this.actions.parse(msg);
          
        // TODO next step is to:
        //      1. Store any actions that occurred since `lastFrame` (the last frame received from the channel)
        //      2. When playing back, include any actions that has occured during that frame.

      }.bind(this)
    }

    this.host && this.createPuck(); // only create as host, or it will come as a message
    this.createPaddle(0); // 0 means "top" (i.e. height*0)
    this.createPaddle(1); // 1 means "bottom" (i.e. height*1)

    if( !this.host )
      this.renderer.invert()
  },

  destroy: function(){
    this.form.hostScore.parentNode.style.border = 'none'
    this.form.guestScore.parentNode.style.border = 'none'
    this.form.reset()

    // clear the canvas...
    this.renderer.canvas.width = this.renderer.canvas.width

    delete this.forces
    delete this.paddles
    delete this.pointMasses
    delete this.physics.forces
    delete this.physics.paddles
    delete this.physics.pointMasses 
    delete this.renderer.forces
    delete this.renderer.paddles
    delete this.renderer.pointMasses
  },

  controls: function(inputs){
    if( settings.data.paused ) return;

    settings.data.frame = this.physics.frame;
    settings.data.speed = this.pointMasses.length && this.pointMasses[0].velocity.length;

    if( settings.data.reverse != this.reversed ){
      this.actions.create(Actions.REVERSE);
    }

    if( inputs.pressed('d') ){
      console.log('sending debug diff?')
      this.actions.create(Actions.DEBUG_DIFF);
    }

    // only the host can create new pucks
    if( this.host && inputs.pressed('b') ){
      this.createPuck();
    }

    // only the host can create attractors
   /* if( this.host && inputs.pressed('up') ){ 
      if( Math.random() > .5 )
        this.actions.create(Actions.FORCE_ATTRACT,inputs.mouse.x,inputs.mouse.y);
      else
        this.actions.create(Actions.FORCE_REPELL,inputs.mouse.x,inputs.mouse.y);
    }
    */

    // paddle is controlled by motion or mouse
    var paddleIndex = this.host ? 0 : 1;
    if( settings.data.inputType == "motion" && inputs.motion.moved ){
      this.actions.create(Actions.PADDLE_MOVE,paddleIndex,inputs.motion.x);

    } else if( settings.data.inputType == "mouse" && inputs.mouse.moved ){
      this.actions.create(Actions.PADDLE_MOVE,paddleIndex,inputs.mouse.x);

    }

    //replace with mediastream
    if( inputs.tracker.videoCanvas ){
      
      this.renderer.setVideoTexture(inputs.tracker.videoCanvas);

//    if( inputs.motion.videoTexture && this.renderer.setVideoTexture ){
 //     this.renderer.setVideoTexture(inputs.motion.videoTexture);
//>>>>>>> 52f50b3586af9b2b2de49ac218387794f64b677e
    }
  },
  
  update: function(dt,t){
    if( settings.data.paused ) return;

    // update arena size settings
    if( this.width !== settings.data.arenaWidth || this.height != settings.data.arenaHeight ){
      this.bounds.r = settings.data.arenaWidth - this.bounds.l;
      this.bounds.b = settings.data.arenaHeight - this.bounds.t;
    }

    this.physics.update(dt,t);
  },

  render: function(alpha){
    this.renderer.render(alpha)
  }

}

