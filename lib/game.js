var requestAnimationFrame = require('request-animation-frame')
  , Emitter = require('emitter')
  , debug = require('debug')('game')
  , settings = require('./settings')
  , World = require('./world')
  , actions = require('./actions')
  , Physics = require('./sim/physics')
  , Tick = require('./support/tick')
  , AI = require('./ai');

window.performance = window.performance || {};
performance.now = (function() {
  return performance.now       ||
         performance.mozNow    ||
         performance.msNow     ||
         performance.oNow      ||
         performance.webkitNow ||
         function() { return new Date.now(); };
})();

// Example usage:
//  var g = new Game()
//  g.actions.register({name:fn})
//  g.run()

module.exports = Game;

Game.TIMESTEP = 1/60;
// Game.TIMESTEP = 1/30;

function Game(name,renderer){
  this.tick = new Tick();
  this.world = new World(name,this.tick);
  this.physics = new Physics();
  this.ai = new AI();

  this.running = false;
  this.paused = false;

  this.on('update',this.ai.update.bind(this.ai))
  this.on('pre update',this.physics.update.bind(this.physics))
  this.on('update',this.tick.update.bind(this.tick))

  if( renderer ){
    this.renderer = renderer;
    this.on('render',this.renderer.render.bind(this.renderer))
    // redirect 'renderer'-events from actions to renderer.triggerEvent
    actions.on('renderer',this.renderer.triggerEvent.bind(this.renderer))
  }
}

Emitter(Game.prototype);

Game.prototype.reset = function(){
  this.world.reset();
  if( this.renderer )
    this.renderer.reset();
}


Game.prototype.update = function(){
  this.emit('pre update',this.world,Game.TIMESTEP)
  this.emit('update',this.world,Game.TIMESTEP)
  this.emit('post update',this.world,Game.TIMESTEP)
}

Game.prototype.render = function(){
  this.emit('render',this.world,0);
}

Game.prototype.pause = function(){
  this.paused = true;
}

Game.prototype.resume = function(){
  this.paused = false;
}

Game.prototype.run = function(){
  debug('run')

  if( this.running )
    throw new Error('already running');

  var currentTime = performance.now() / 1000
    , accumulator = 0.0
    , game = this
    , physics = this.physics
    , renderer = this.renderer
    , world = this.world;

  function changevisibility( event ) {
    if( document.hidden === false || document.webkitHidden === false ){
      currentTime = performance.now() / 1000;
    }
  }
  document.addEventListener( 'visibilitychange',changevisibility,false);
  document.addEventListener( 'webkitvisibilitychange',changevisibility,false);

  function loop(){
    if( game.running )
      requestAnimationFrame(loop);

    if( game.paused )
      return;

    var timestep = Game.TIMESTEP
      , newTime = performance.now() / 1000 // in seconds
      , deltaTime = newTime - currentTime
      , maxDeltaTime = 0.25
      , updated = false;
    currentTime = newTime;


    // note: max frame time to avoid spiral of death
    if (deltaTime > maxDeltaTime){
      deltaTime = maxDeltaTime;
    }

    // update
    accumulator += deltaTime;
    while(accumulator >= timestep){
      game.emit('pre update',world,timestep)
      game.emit('update',world,timestep)
      game.emit('post update',world,timestep)
      accumulator -= timestep;
      updated = true;
      if( !game.running ){
        break;
      }
    }

    // render
    if( updated ){
      game.emit('render',world,accumulator/timestep);
    }
  }
  this.running = true;
  loop();
  return this;
}

