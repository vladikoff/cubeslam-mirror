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
  debug('reset %s',this.world.name)
  this.world.reset();
  if( this.renderer ){
    this.renderer.reset();
  }
}

Game.prototype.setRenderer = function(renderer){
  debug('set renderer %s',this.world.name)
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
  var ts = settings.data.timestep;
  this.emit('pre update',this.world,ts)
  this.emit('update',this.world,ts)
  this.emit('post update',this.world,ts)
}

Game.prototype.render = function(){
  this.emit('render',this.world,0);
}

Game.prototype.pause = function(){
  debug('pause %s',this.world.name)
  this.paused = true;
}

Game.prototype.resume = function(){
  debug('resume %s',this.world.name)
  this.paused = false;
}

Game.prototype.run = function(){
  debug('run')

  if( this.running ){
    throw new Error('already running');
  }

  var currentTime = now()
    , accumulator = 0.0
    , game = this
    , world = this.world;

  function changevisibility( event ) {
    if( document.hidden === false || document.webkitHidden === false ){
      currentTime = now();
    }
  }
  document.addEventListener( 'visibilitychange',changevisibility,false);
  document.addEventListener( 'webkitvisibilitychange',changevisibility,false);

  function loop(){
    if( game.running ){
      requestAnimationFrame(loop);
    }
    var timestep = settings.data.timestep;
    var frameStart = now();
    game.emit('enter frame',world);

    if( !game.paused ){

      var newTime = now()
        , deltaTime = newTime - currentTime
        , maxDeltaTime = timestep*settings.data.maxUpdatesPerFrame;
      currentTime = newTime;

      // note: max frame time to avoid spiral of death
      if (deltaTime > maxDeltaTime){
        // console.warn('exceeding max deltatime ('+maxDeltaTime+'): '+deltaTime)
        deltaTime = maxDeltaTime;
      }

      // update
      var updatesStart = now();
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
      var updatesEnd = now();
      if( updatesEnd - updatesStart > timestep ){
        // console.warn('slow update: '+(updatesEnd - updatesStart).toFixed(2)+'ms')
      }

      // render
      var renderStart = now();
      game.emit('render',world,accumulator/timestep);
      var renderEnd = now();
      if( renderEnd - renderStart > timestep ){
        // console.warn('slow render: '+(renderEnd - renderStart).toFixed(2)+'ms')
      }
    }

    game.emit('leave frame',world);

    var frameEnd = now();
    if( frameEnd-frameStart > timestep ){
      // console.warn('slow frame: '+(frameEnd-frameStart).toFixed(2)+' ms\n');
    }
  }
  this.running = true;
  loop();
  return this;
}