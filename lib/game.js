var requestAnimationFrame = require('request-animation-frame')
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
}

Game.prototype.pushState = function(state){
  debug('pushState',this.getName(state))
  if( typeof state != 'object' )
    throw new Error('invalid state. must be object.');
  this.states.push(state);
  state.game = this;
  state.create && state.create();
  return this;
}

Game.prototype.popState = function(){
  debug('popState')
  var state = this.states.pop();
  if( state ){
    state.destroy && state.destroy();
    delete state.game;
  }
  return this;
}

Game.prototype.hasState = function(state){
  return this.states.indexOf(state) !== -1;
}

Game.prototype.isState = function(state){
  return state === this.states[this.states.length - 1];
}

Game.prototype.switchState = function(state){
  debug('switchState',this.getName(state))
  this.popState().pushState(state);
}

Game.prototype.run = function(){
  debug('run')

  if( !this.states.length )
    throw new Error('no states. must pushState() first.');

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
    var state = game.states[game.states.length - 1];
    if( state.game && state.render )
      state.render(accumulator/timestep);

    // reset inputs
    inputs.reset();
  }
  loop();
  return this;
}

Game.prototype.getName = function(state){
  if( state.name )
    return state.name;
  if( state.constructor && state.constructor.name !== 'Object')
    return state.constructor.name;
  return '';
}
