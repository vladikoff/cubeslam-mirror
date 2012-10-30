var requestAnimationFrame = require('./request-animation-frame')
  , Inputs = require('./inputs')
  , debug = require('debug')('game');

// Example usage:
// new Game()
//   .pushState(MenuState)
//   .run()

module.exports = Game;


function Game(opts){
  if( typeof opts != "object" )
    opts = {}
  this.options = {
    timestep: opts.timestep || 1/60,
    element: opts.element || document
  }
  this.inputs = new Inputs(this.options.element);
  this.states = [];
  this.current = null;
}

Game.prototype.pushState = function(state){
  debug('pushState')
  if( typeof state != 'object' )
    throw new Error('invalid state. must be object.');
  this.states.push(state);
  this.current = state;
  state.game = this;
  state.create && state.create();
  return this;
}

Game.prototype.popState = function(){
  debug('popState')
  var state = this.current;
  state.destroy && state.destroy();
  delete state.game;
  this.current = this.states.pop();
  return this;
}

Game.prototype.isState = function(state){
  return state === this.current;
}

Game.prototype.switchState = function(state){
  debug('switchState')
  this.popState().pushState(state);
}

Game.prototype.run = function(){
  if( !this.current )
    throw new Error('no current state. must pushState() first.');
  debug('run')

  var t = 0.0
    , timestep = this.options.timestep
    , currentTime = 0.0
    , accumulator = 0.0
    , game = this
    , inputs = this.inputs;

  function loop(){
    requestAnimationFrame(loop);
    
    var newTime = Date.now() / 1000 // in seconds
      , deltaTime = newTime - currentTime
      , maxDeltaTime = 0.25;
    currentTime = newTime;

    if( !game.states.length ){
      console.error('no more states. done!')
      debug('stop')
      return;
    }
    
    // note: max frame time to avoid spiral of death
    if (deltaTime > maxDeltaTime)
      deltaTime = maxDeltaTime;

    // update 
    accumulator += deltaTime;
    var input = true;
    while(accumulator >= timestep) {
      // update all the states
      for(var i=0; i < game.states.length; i++){
        var state = game.states[i];

        // make sure it's still alive
        if( !state.game ) 
          break;
        
        // call input once
        if( input && state.controls )
          state.controls(inputs);

        // call update as many times as necessary
        if( state.update )
          state.update(timestep,t);
      }
      input = false;
      t += timestep;
      accumulator -= timestep;
    }

    // render only the current state
    var state = game.current;
    if( state.game && state.render )
      state.render(accumulator/timestep);

    // reset inputs
    inputs.reset();
  }
  loop();
  return this;
}