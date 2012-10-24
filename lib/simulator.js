var Physics = require('./sim/physics')
  , PointMass = require('./sim/point-mass')
  , Force = require('./sim/force')
  , Point = require('./sim/point')
  , Rect = require('./sim/rect')
  , Renderer = require('./renderer-3d')
  , Actions = require('./actions');

module.exports = Simulator;

function Simulator(canvas,form){
  this.form = form;
  this.width = 800//canvas.width;
  this.height = 1600//canvas.height;
  this.bounds = new Rect(1,this.width-1,this.height-1,1);
  this.physics = new Physics();
  this.renderer = new Renderer(canvas,this.bounds);
  this.actions = Actions(this);

  // for singleplayer
  this.host = true;
  this.channel = {send: function(){}}; 
}

Simulator.prototype = {

  createPuck: function(){
    var puck = new PointMass(this.width/2,this.height/2);
    puck.bounds = this.bounds;
    puck.onbounds = function(at){
      if( at.y <= this.bounds.t ){
        var x = this.paddles[0].x
          , hw = this.paddles[0].width / 2;
        console.log('hit host',at.x,x-hw,x+hw)
        if( at.x >= x - hw && at.x <= x + hw ){
          console.log(' - paddle')
          this.host && this.actions.create(Actions.SCORE_ALIVE)

        } else {
          console.log(' - wall')
          this.host && this.actions.create(Actions.SCORE_RESET)
          this.host && this.actions.create(Actions.SCORE_GUEST)
        }
      } else if ( at.y >= this.bounds.b ){
        var x = this.paddles[1].x
          , hw = this.paddles[1].width / 2;
        console.log('hit guest',at.x,x-hw,x+hw)
        if( at.x >= x - hw && at.x <= x + hw ){
          console.log(' - paddle')
          this.host && this.actions.create(Actions.SCORE_ALIVE)

        } else {
          console.log(' - wall')
          this.host && this.actions.create(Actions.SCORE_RESET)
          this.host && this.actions.create(Actions.SCORE_HOST)
        }
      }
    }.bind(this)
    puck.applyForce(-40000,40000)
    this.pointMasses.push(puck);
    this.puck = puck;
  },

  createPaddle: function(y){
    var paddle = new Point(this.width/2,y);
    paddle.width = 50;
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

    this.form.frame.value = this.physics.frame;
    this.reversed = this.form.reverse.checked;

    // highlight "me"
    if( this.host )
      this.form.hostScore.parentNode.style.border = 'solid 3px green';
    else 
      this.form.guestScore.parentNode.style.border = 'solid 3px green';

    if( this.channel ){
      this.channel.onmessage = function(e){
        var msg = e.data;
        console.log('onmessage',msg,this.physics.frame)

        this.actions.parse(e.data);
          
        // TODO next step is to:
        //      1. Store any actions that occurred since `lastFrame` (the last frame received from the channel)
        //      2. When playing back, include any actions that has occured during that frame.

      }.bind(this)
    }

    // this.createCurtain(60,40);
    // this.createBodies(25);
    this.createPuck();
    this.createPaddle(this.bounds.t);
    this.createPaddle(this.bounds.b);

    if( !this.host )
      this.renderer.invert()
  },

  destroy: function(){
    delete this.puck
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
    if( this.form.paused.checked ) return;

    this.form.frame.value = this.physics.frame;
    this.form.speed.value = this.puck.velocity.length;

    if( this.form.reverse.checked != this.reversed ){
      this.actions.create(Actions.REVERSE);
    }

    if( inputs.keyboard.d ){
      diffSim('diff @'+this.physics.frame);
    }

    if( this.renderer.within(inputs.mouse) ){
      // only the host can create attractors

      if( this.host && inputs.mouse.up ){ 
        if( Math.random() > .5 )
          this.actions.create(Actions.FORCE_ATTRACT,inputs.mouse.x,inputs.mouse.y);
        else
          this.actions.create(Actions.FORCE_REPELL,inputs.mouse.x,inputs.mouse.y);
      }

      if( inputs.mouse.moved ){
        var paddleIndex = this.host ? 0 : 1
          , inverted =  this.host ? !!this.renderer.scene : !this.renderer.scene;

        this.actions.create(Actions.PADDLE_MOVE,paddleIndex,inverted,inputs.mouse.x/window.innerWidth);

      }
    }

    inputs.reset()
  },
  
  update: function(dt,t){
    if( this.form.paused.checked ) return;
    this.physics.update(dt,t);
  },

  render: function(alpha){
    this.renderer.render(alpha)
  }

}

