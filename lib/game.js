var requestAnimationFrame = require('request-animation-frame')
  , Emitter = require('emitter')
  , debug = require('debug')('game')
  , settings = require('./settings')
  , World = require('./world')
  , actions = require('./actions')
  , Physics = require('./sim/physics')
  , Puppeteer = require('./puppeteer')
  , levels = require('./levels')
  , Tick = require('./support/tick')
  , AI = require('./ai');


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
  this.puppeteer = new Puppeteer()
  this.ai = new AI();

  // add the available levels
  this.puppeteer.add(levels.level1);
  this.puppeteer.add(levels.level2);
  this.puppeteer.add(levels.level3);
  this.puppeteer.add(levels.level4);
  this.puppeteer.add(levels.level5);
  this.puppeteer.add(levels.level6);
  this.puppeteer.on('change',function(level){
    //should I reference levels from here really?
    console.log(this.puppeteer.levels[level].ai);
    if( this.ai ) this.ai.updateBrain(this.puppeteer.levels[level].ai)
  }.bind(this))

  this.renderer = renderer;
  this.running = false;
  this.replaying = false;

  this.on('pre update',this.ai.update.bind(this.ai))
  this.on('pre update',this.puppeteer.update.bind(this.puppeteer))
  this.on('update',this.physics.update.bind(this.physics))
  this.on('update',this.tick.update.bind(this.tick))

  if( this.renderer ){
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

  var currentTime = Date.now() / 1000
    , accumulator = 0.0
    , game = this
    , physics = this.physics
    , renderer = this.renderer
    , world = this.world;

  function loop(){
    if( game.running )
      requestAnimationFrame(loop);

    if( game.paused )
      return;

    var timestep = Game.TIMESTEP
      , newTime = Date.now() / 1000 // in seconds
      , deltaTime = newTime - currentTime
      , maxDeltaTime = 0.25;
    currentTime = newTime;

    // note: max frame time to avoid spiral of death
    if (deltaTime > maxDeltaTime)
      deltaTime = maxDeltaTime;

    if (game.replaying)
      console.error('REPLAYING IN LOOP! NO!')

    // update
    accumulator += deltaTime;
    while(accumulator >= timestep){
      game.emit('pre update',world,timestep)
      game.emit('update',world,timestep)
      game.emit('post update',world,timestep)
      accumulator -= timestep;
      if( !game.running )
        break;
    }

    // render
    game.emit('render',world,accumulator/timestep);
  }
  this.running = true;
  loop();
  return this;
}

