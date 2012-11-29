var Physics = require('./physics')
  , actions = require('./actions')
  , world = require('../world')
  , settings = require('../settings')
  , shapes = require('./shapes')
  , Body = require('./body');

module.exports = Simulator;

function Simulator(){
  this.name = 'Simulator';
  this.physics = new Physics();

  actions.flush(); // make sure we dont have any previously buffered actions
  this.setup()
}
Simulator.prototype = {

  pause: function(){
    actions.gamePause();
  },

  resume: function(){
    actions.gameResume();
  },

  createPuck: function(){
    actions.puckCreate(.5,.3,20);

    // start it off with a push
    var lastPuck = world.pucks[world.pucks.length - 1]
    actions.puckPush(lastPuck.id, 0, 50000)
  },

  createPaddle: function(x,y,w,h){
    var aw = settings.data.arenaWidth
    var ah = settings.data.arenaHeight
    var paddle = new Body(shapes.rect(w*aw,h*ah),x*aw,y*ah)
    paddle.id = world.paddles.length;
    world.bodies.push(paddle);
    world.paddles.push(paddle);
    console.log('created paddle',w*aw,h*ah,x*aw,y*ah)
    return paddle.id;
  },

  setup: function(){
    world.players.a.paddle = this.createPaddle(.5,1,.2,.05); // 0 means "top" (i.e. height*0)
    world.players.b.paddle = this.createPaddle(.5,0,.2,.05); // 1 means "bottom" (i.e. height*1)
    world.me = world.host ? world.players.a : world.players.b;
    world.opponent = world.host ? world.players.b : world.players.a;

    // only create as host, or it will come as a message
    world.host && this.createPuck();
  },

  create: function(){
    this.game.inputs
      // .setElement(this.renderer.canvas)
      .bind(this.game.inputs.B,'b')
      .bind(this.game.inputs.O,'o')
      .bind(this.game.inputs.E,'e')
      .bind(this.game.inputs.S,'s')
      .bind(this.game.inputs.P,'debug')
      .bind(this.game.inputs.LEFT_ARROW,'left')
      .bind(this.game.inputs.RIGHT_ARROW,'right')
      .bind(this.game.inputs.A,'left')
      .bind(this.game.inputs.D,'right');

    // receive messages from peer
    if( this.channel ){
      this.channel.onmessage = function(e){
        // scope to `this` because `createAt` needs physics...
        actions.parse.call(this,e.data);

        // TODO next step is to:
        //      1. Store any actions that occurred since `lastFrame` (the last frame received from the channel)
        //      2. When playing back, include any actions that has occured during that frame.

      }.bind(this)
    }
  },

  destroy: function(){
    this.game.inputs
      .unbind(this.game.inputs.B)
      .unbind(this.game.inputs.O)
      .unbind(this.game.inputs.E)
      .unbind(this.game.inputs.S)
      .unbind(this.game.inputs.P)
      .unbind(this.game.inputs.A)
      .unbind(this.game.inputs.D)
      .unbind(this.game.inputs.LEFT_ARROW)
      .unbind(this.game.inputs.RIGHT_ARROW);

    if( this.channel ){
      this.channel.onmessage = null
      this.channel = null
    }
    world.reset()
  },

  controls: function(inputs){
    if( !world.paused ){

      if( inputs.pressed('debug') ){
        actions.debugDiff();
      }

      // only the host can modify the simulation
      if( world.host ){

        // create pucks
        if( inputs.pressed('b') ){
          this.createPuck();
        }

        // create obstacle
        if( inputs.pressed('o') ){
          actions.obstacleCreate('hexagon');
        }

        // create extraball
        if( inputs.pressed('e') ){
          actions.obstacleCreate('extraball');
        }

        // create speedball
        if( inputs.pressed('s') ){
          actions.obstacleCreate('speedball');
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
        actions.paddleMove(world.me.paddle, world.host ? inputs.motion.x : 1-inputs.motion.x);

      } else if( settings.data.inputType == "mouse" && inputs.mouse.moved ){
        actions.paddleMove(world.me.paddle, world.host ? inputs.mouse.x : 1-inputs.mouse.x);

      } else if( settings.data.inputType == "keyboard" ){
        // TODO ease the position of the paddle instead of stepping
        if( inputs.down('left') ){
          var x = world.paddles[world.me.paddle].current[0] - settings.data.keyboardSpeed;
          x /= settings.data.arenaWidth
          actions.paddleMove(world.me.paddle, world.host ? x : 1-x);
        } else if( inputs.down('right') ){
          var x = world.paddles[world.me.paddle].current[0] + settings.data.keyboardSpeed;
          x /= settings.data.arenaWidth
          actions.paddleMove(world.me.paddle, world.host ? x : 1-x);
        }

      }

      // ai controller (only available in SingleState)
      if( inputs.ai ){
        actions.paddleMove(world.opponent.paddle,inputs.ai.x);
        inputs.ai = null
      }
    }

    // send any actions to the peer
    this.channel && actions.flush(this.channel);
  },

  update: function(dt,t){
    if( world.paused ) return;
    this.physics.update(world, dt, t);
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  }

}
