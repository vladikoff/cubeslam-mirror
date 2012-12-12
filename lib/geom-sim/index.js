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
    var paddle = new Body(shapes.rect(w*aw,settings.data.puckRadius*8),x*aw,y*ah)
    paddle.id = world.paddles.length;
    world.bodies.push(paddle);
    world.paddles.push(paddle);
    console.log('created paddle',w*aw,h*ah,x*aw,y*ah)
    return paddle.id;
  },

  create: function(){
    // make sure we dont have any previously buffered actions
    actions.flush();

    world.players.a.paddle = this.createPaddle(.5,1,.15,.08); // 0 means "top" (i.e. height*0)
    world.players.b.paddle = this.createPaddle(.5,0,.15,.08); // 1 means "bottom" (i.e. height*1)
    world.me = world.host ? world.players.a : world.players.b;
    world.opponent = world.host ? world.players.b : world.players.a;

    // only create as host, or it will come as a message
    world.host && this.createPuck();

    this.game.inputs
      .bind('b','puck')
      .bind('j','obstacle')
      .bind('k','multiball')
      .bind('l','fastball')
      .bind('p','debug')
      .bind('up','fire')
      .bind('left','left')
      .bind('right','right')
      .bind('w','fire')
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
  },

  destroy: function(){

    this.game.inputs
      .unbind('b')
      .unbind('j')
      .unbind('k')
      .unbind('l')
      .unbind('p')
      .unbind('w')
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

      // create shot
      if( inputs.pressed('fire')){
        // TODO generate an id, x, y and v
        var id = '' + world.me.paddle + ':' + world.bullets.length
          , c = world.paddles[world.me.paddle].current
          , v = world.me.paddle == 0 ? 10 : -10;
        actions.bulletCreate(id,c[0],c[1]-v*10,v);
      }

      // only the host can modify the simulation
      if( world.host ){

        var aw = settings.data.arenaWidth
          , ah = settings.data.arenaHeight;

        // create pucks
        if( inputs.pressed('puck') ){
          this.createPuck();
        }

        // create obstacle
        if( inputs.pressed('obstacle') ){
          var x = aw/4 + aw/2 * Math.random()
          var y = ah/4 + ah/2 * Math.random()
          actions.obstacleCreate('hexagon',x,y);
        }

        // create multiball
        if( inputs.pressed('multiball') ){
          var x = aw/4 + aw/2 * Math.random()
          var y = ah/4 + ah/2 * Math.random()
          actions.extraCreate('multiball',x,y);
        }

        // create fastball
        if( inputs.pressed('fastball') ){
          var x = aw/4 + aw/2 * Math.random()
          var y = ah/4 + ah/2 * Math.random()
          actions.extraCreate('fastball',x,y);
        }

        // create forces
        /*if( inputs.pressed('up') ){
          if( Math.random() > .5 )
            actions.forceAttract(inputs.mouse.x,inputs.mouse.y);
          else
            actions.forceRepell(inputs.mouse.x,inputs.mouse.y);
        }*/

      }


      if( inputs.mouse.moved ){
        // TODO project the mouse position through the renderer
        // inputs.mouse is screen position
        var x = inputs.mouse.x / settings.data.arenaWidth;
        actions.paddleMove(world.me.paddle, world.host ? x : 1-x);
      }

      // keyboard overrides mouse move
      var max = settings.data.keyboardSpeedMax
        , acc = settings.data.keyboardAccelerate
        , damp = settings.data.keyboardDamping
        , speed = world.keyboardSpeed;

      if( inputs.down('left') ){
        speed += -(max+speed) * (1-acc*acc);
        var x = world.paddles[world.me.paddle].current[0] + (world.host ? speed : -speed);
        x /= settings.data.arenaWidth
        actions.paddleMove(world.me.paddle, x);

      } else if( inputs.down('right') ){
        speed += +(max-speed) * (1-acc*acc);
        var x = world.paddles[world.me.paddle].current[0] + (world.host ? speed : -speed);
        x /= settings.data.arenaWidth
        actions.paddleMove(world.me.paddle, x);

      } else {
        speed *= damp;
        if( Math.abs(speed) > 1 ) {
          var x = world.paddles[world.me.paddle].current[0] + (world.host ? speed : -speed);
          x /= settings.data.arenaWidth
          actions.paddleMove(world.me.paddle, x);
        }
      }
      world.keyboardSpeed = speed;

      // ai controller
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
