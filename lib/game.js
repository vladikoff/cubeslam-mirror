var requestAnimationFrame = require('request-animation-frame')
  , Emitter = require('emitter')
  , debug = require('debug')('game')
  , World = require('./world')
  , Actions = require('./actions')
  , Inputs = require('./inputs')
  , Physics = require('./geom-sim/physics');

// Example usage:
//  var g = new Game()
//  g.actions.register({name:fn})
//  g.run()

module.exports = Game;

function Game(renderer){
  this.world = new World();
  this.actions = new Actions(this.world);
  this.physics = new Physics();
  this.inputs = new Inputs();
  this.renderer = renderer;
  this.running = false;

  this.on('input',this.inputs.record.bind(this.inputs))
  this.on('update',this.inputs.apply.bind(this.inputs))
  this.on('update',this.physics.update.bind(this.physics))

  if( this.renderer )
    this.on('render',this.renderer.render.bind(this.renderer))
}

Emitter(Game.prototype);

Game.prototype.reset = function(){
  this.world.reset();
  if( this.renderer )
    this.renderer.reset();
}

Game.prototype.run = function(timestep){
  debug('run')

  if( !this.actions.types.length )
    throw new Error('missing actions (must be registered)');

  if( this.running )
    throw new Error('already running');

  var t = 0.0
    , timestep = timestep || 1/60
    , currentTime = 0.0
    , accumulator = 0.0
    , game = this
    , physics = this.physics
    , renderer = this.renderer
    , world = this.world
    , inputs = this.inputs;

  function loop(){
    if( game.running )
      requestAnimationFrame(loop);

    var newTime = Date.now() / 1000 // in seconds
      , deltaTime = newTime - currentTime
      , maxDeltaTime = 0.25;
    currentTime = newTime;

    // note: max frame time to avoid spiral of death
    if (deltaTime > maxDeltaTime)
      deltaTime = maxDeltaTime;

    // update
    accumulator += deltaTime;
    while(accumulator >= timestep) {
      game.emit('update',world,timestep,t);
      inputs.reset() // must be done after all updates
      t += timestep;
      accumulator -= timestep;
    }

    // render
    game.emit('render',world,accumulator/timestep);
  }
  this.running = true;
  loop();
  return this;
}
