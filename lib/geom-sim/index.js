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
    actions.puckSync();
  },

  resume: function(){
    actions.gameResume();
  },

  createPuck: function(){
    // add to center of arena
    var aw = settings.data.arenaWidth
    var ah = settings.data.arenaHeight
    actions.puckCreate(.5*aw,.5*ah,5);

    // start it off with a push
    // TODO change the initial direction depending on who lost
    var lastPuck = world.pucks[world.pucks.length - 1]
    actions.puckSpeed(lastPuck.id, 0, world.level.speed)
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
    world.players.a.paddle = this.createPaddle(.5,1,.15,.08); // 0 means "top" (i.e. height*0)
    world.players.b.paddle = this.createPaddle(.5,0,.15,.08); // 1 means "bottom" (i.e. height*1)
    world.me = world.host ? world.players.a : world.players.b;
    world.opponent = world.host ? world.players.b : world.players.a;

    // only create as host, or it will come as a message
    world.host && this.createPuck();
  },

  create: function(){
    this.game.inputs
      .bind('b','puck')
      .bind('j','obstacle')
      .bind('k','extraball')
      .bind('l','speedball')
      .bind('p','debug')
      .bind('left','left')
      .bind('right','right')
      .bind('up','fire')
      .bind('a','left')
      .bind('d','right')
      .bind('mouse left','fire');

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

    // temporary "level"
    this.extraFrame = 300 + Math.random() * 300; // = 5-10 seconds
    this.obstacleFrame = 600 + Math.random() * 300; // = 10-15 seconds
  },

  destroy: function(){

    this.game.inputs
      .unbind('b')
      .unbind('j')
      .unbind('k')
      .unbind('l')
      .unbind('p')
      .unbind('left')
      .unbind('right')
      .unbind('up')
      .unbind('a')
      .unbind('d')
      .unbind('mouse left')

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
        if( inputs.pressed('puck') ){
          this.createPuck();
        }

        var aw = settings.data.arenaWidth
          , ah = settings.data.arenaHeight;

        // create obstacle
        if( inputs.pressed('obstacle') || (world.frame > this.obstacleFrame) ){
          var x = aw/4 + aw/2 * Math.random()
          var y = ah/4 + ah/2 * Math.random()
          actions.obstacleCreate('hexagon',x,y);
          this.obstacleFrame = Infinity;

          // remove it again after 5-10 seconds
          this.removeObstacleFrame = world.frame + 300 + Math.random()*300;
        }

        // (temporary) remove obstacle again
        if( world.frame > this.removeObstacleFrame ){
          actions.obstacleDestroy('hexagon');

          // and add it back, hihi
          this.obstacleFrame = world.frame + 900 + Math.random()*300;
          this.removeObstacleFrame = Infinity;
        }

        // create extraball
        if( inputs.pressed('extraball') || (world.frame > this.extraFrame) ){
          var x = aw/4 + aw/2 * Math.random()
          var y = ah/4 + ah/2 * Math.random()
          actions.extraCreate('extraball',x,y);
          this.extraFrame = Infinity;
        }

        // create speedball
        if( inputs.pressed('speedball') ){
          var x = aw/4 + aw/2 * Math.random()
          var y = ah/4 + ah/2 * Math.random()
          actions.extraCreate('speedball',x,y);
        }

        // create forces
        /*if( inputs.pressed('up') ){
          if( Math.random() > .5 )
            actions.forceAttract(inputs.mouse.x,inputs.mouse.y);
          else
            actions.forceRepell(inputs.mouse.x,inputs.mouse.y);
        }*/

        // create shot
        if( inputs.pressed('fire')){
          // actions.paddleShoot()
        }

      }


      // paddle is controlled by motion or mouse
      if( settings.data.inputType == "motion" && inputs.motion.moved ){
        actions.paddleMove(world.me.paddle, world.host ? inputs.motion.x : 1-inputs.motion.x);

      } else if( settings.data.inputType == "mouse" && inputs.mouse.moved ){
        actions.paddleMove(world.me.paddle, world.host ? inputs.mouse.x : 1-inputs.mouse.x);

      } else if( settings.data.inputType == "keyboard" ){

        if( inputs.down('left') ){
          world.keyboardSpeed += ( settings.data.keyboardSpeedMax*-1 - world.keyboardSpeed)/4;
          var x = world.paddles[world.me.paddle].current[0] + world.keyboardSpeed;
          x /= settings.data.arenaWidth
          actions.paddleMove(world.me.paddle, world.host ? x : 1-x);

        } else if( inputs.down('right') ){
          world.keyboardSpeed += ( settings.data.keyboardSpeedMax - world.keyboardSpeed)/4;
          var x = world.paddles[world.me.paddle].current[0] + world.keyboardSpeed;
          x /= settings.data.arenaWidth
          actions.paddleMove(world.me.paddle, world.host ? x : 1-x);

        } else {
          world.keyboardSpeed *= 0.9;
          if( Math.abs(world.keyboardSpeed) > 1 ) {
            var x = world.paddles[world.me.paddle].current[0] + world.keyboardSpeed;
            x /= settings.data.arenaWidth
            actions.paddleMove(world.me.paddle, world.host ? x : 1-x);
          }
        }

      }

      // ai controller (only available in SingleState)
      if( inputs.ai ){
        var x = inputs.ai[0] / settings.data.arenaWidth;
        actions.paddleMove(world.opponent.paddle,x);
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
