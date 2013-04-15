var requestAnimationFrame = require('request-animation-frame')
  , Emitter = require('emitter')
  , debug = require('debug')('game')
  , settings = require('./settings')
  , World = require('./world')
  , actions = require('./actions')
  , physics = require('./sim/physics')
  , Tick = require('./support/tick')
  , now = require('now')
  , AI = require('./ai');

// Example usage:
//  var g = new Game()
//  g.actions.register({name:fn})
//  g.run()

module.exports = Game;

// var requestAnimationFrame = function(fn){setTimeout(fn,1000/60)}

Game.TIMESTEP = 1/60;
// Game.TIMESTEP = 1/30;

function Game(name,renderer){

  this.tick = new Tick();
  this.world = new World(name,this.tick);
  this.ai = new AI(name);

  this.running = false;
  this.paused = false;

  this.on('update',physics.update)
  this.on('update',this.ai.update.bind(this.ai))
  this.on('update',this.tick.update.bind(this.tick))

  renderer && this.setRenderer(renderer)
}

Emitter(Game.prototype);

Game.prototype.reset = function(){
  this.world.reset();
  if( this.renderer )
    this.renderer.reset();
}

Game.prototype.setRenderer = function(renderer){
  if( this.renderer ){
    this.off('render')
    actions.off('renderer')
  }
  this.renderer = renderer;
  this.on('render',this.renderer.render.bind(this.renderer))
  // redirect 'renderer'-events from actions to renderer.triggerEvent
  actions.on('renderer',this.renderer.triggerEvent.bind(this.renderer))
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

  var currentTime = now() / 1000
    , accumulator = 0.0
    , game = this
    , world = this.world;

  function changevisibility( event ) {
    if( document.hidden === false || document.webkitHidden === false ){
      currentTime = now() / 1000;
    }
  }
  document.addEventListener( 'visibilitychange',changevisibility,false);
  document.addEventListener( 'webkitvisibilitychange',changevisibility,false);

  function loop(){
    if( game.running ){
      requestAnimationFrame(loop);
    }

    game.emit('enter frame',world);

    if( !game.paused ){

      var timestep = Game.TIMESTEP
        , newTime = now() / 1000 // in seconds
        , deltaTime = newTime - currentTime
        , maxDeltaTime = .25;//timestep*5;
      currentTime = newTime;

      // note: max frame time to avoid spiral of death
      if (deltaTime > maxDeltaTime){
        console.warn('exceeding max deltatime',deltaTime,maxDeltaTime)
        deltaTime = maxDeltaTime;
      }

      // update
      accumulator += deltaTime;
      while(accumulator >= timestep){
        game.emit('pre update',world,timestep)
        game.emit('update',world,timestep)
        game.emit('post update',world,timestep)
        accumulator -= timestep;
        if( !game.running ){
          break;
        }
      }

      // render
      game.emit('render',world,accumulator/timestep);
    }

    game.emit('leave frame',world);
  }
  this.running = true;
  loop();
  return this;
}