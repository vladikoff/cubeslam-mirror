var requestAnimationFrame = require('./request-animation-frame')
  , Inputs = require('./inputs')
  , debug = require('debug')('game');

// Example usage:
// new Game()
//   .pushState(MenuState)
//   .run()

module.exports = Game;


function Game(){
  this.inputs = new Inputs();
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
    , timestep = 1/60
    , currentTime = 0.0
    , accumulator = 0.0
    , game = this;

  function loop(){
    requestAnimationFrame(loop);
    
    var newTime = Date.now() / 1000 // in seconds
      , deltaTime = newTime - currentTime
      , maxDeltaTime = 0.25;
    currentTime = newTime;

    var state = game.current;
    if( !state ){
      console.error('no more states. done!')
      debug('stop')
      return;
    }
    
    // note: max frame time to avoid spiral of death
    if (deltaTime > maxDeltaTime)
      deltaTime = maxDeltaTime;

    // update 
    accumulator += deltaTime;
    while(accumulator >= timestep) {
      state.game && state.controls && state.controls(game.inputs);
      state.game && state.update && state.update(timestep,t);
      t += timestep;
      accumulator -= timestep;
    }

    // render
    state.game && state.render && state.render(accumulator/timestep);
  }
  loop();
  return this;
}