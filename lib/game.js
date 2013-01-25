var requestAnimationFrame = require('request-animation-frame')
  , Emitter = require('emitter')
  , debug = require('debug')('game')
  , World = require('./world')
  , actions = require('./actions')
  , Inputs = require('./inputs')
  , Physics = require('./geom-sim/physics')
  , Puppeteer = require('./puppeteer')
  , levels = require('./levels')
  , AI = require('./ai');

// Example usage:
//  var g = new Game()
//  g.actions.register({name:fn})
//  g.run()

module.exports = Game;

Game.DEFAULT_TIMESTEP = 1/60;

function Game(renderer){
  this.world = new World();
  this.physics = new Physics();
  this.inputs = new Inputs();
  this.puppeteer = new Puppeteer(this.actions)
  this.ai = new AI();

  this.time = 0;

  // add the available levels
  this.puppeteer.add(levels.level1);
  this.puppeteer.add(levels.level2);
  this.puppeteer.add(levels.level3);
  this.puppeteer.add(levels.level4);
  this.puppeteer.add(levels.level5);
  this.puppeteer.add(levels.level6);
  this.puppeteer.add(levels.level7);
  this.puppeteer.add(levels.level8);

  this.renderer = renderer;
  this.running = false;

  this.on('input',this.inputs.record.bind(this.inputs))
  this.on('update',function(world){
    // store all inputs that happened this frame in history
    this.apply()
    this.inputs.append(world.frame,this.inputs.current)
    this.inputs.current.length = 0;
  })
  this.on('update',this.ai.update.bind(this.ai))
  this.on('update',this.physics.update.bind(this.physics))
  this.on('update',this.puppeteer.update.bind(this.puppeteer))

  if( this.renderer ){
    this.on('render',this.renderer.render.bind(this.renderer))
    // redirect 'renderer'-events from actions to renderer.triggerEvent
    actions.on('renderer',this.renderer.triggerEvent.bind(this.renderer))
  }
}

Emitter(Game.prototype);

Game.prototype.reset = function(){
  this.time = 0;
  this.world.reset();
  if( this.renderer )
    this.renderer.reset();
}

Game.prototype.update = function(timestep){
  this.emit('update',this.world,timestep || Game.DEFAULT_TIMESTEP,this.time);
}

/**
 * Copies the state from the `from`-world to
 * `this.world` and runs `update()` and applies
 * input until it reaches the frame is previously
 * was on.
 *
 * @param  {World} from
 * @return
 */
Game.prototype.fastForward = function(from){
  debug('fastForward %s -> %s',from.world.frame,this.world.frame)
  console.log('fastForward %s -> %s',from.world.frame,this.world.frame)
  var endFrame = this.world.frame
    , inputs = [];

  var diff = actions.debugDiff(this.world);
  this.world.copy(from.world)
  actions.debugDiff(this.world,diff);

  while(this.world.frame < endFrame){
    this.inputs.read(this.world.frame,this.inputs.current)
    this.update();

    // TODO just give up after a while is paused
    if( this.world.paused )
      return console.log('fastForward but is paused...')
  }
}

// ctx.game.replay(ctx.initial.world,inputs[,150])
Game.prototype.replay = function(world,inputs,until){
  console.log('')
  console.log('')
  console.log('========== REEEPLAAAYYYYY =========')
  until = until || this.world.frame;
  var diff = actions.debugDiff(this.world);
  this.world.copy(world);
  this.puppeteer.goto(this.world.levelIndex)
  this.inputs.reset()

  var ctx = {frame: 0, index: 0}
  while(this.world.frame < until){
    inputs.read(this.world.frame,this.inputs.current,ctx)
    // console.log('replay read inputs at frame %s',this.world.frame,this.inputs.current)
    this.update()

    // TODO just give up after a while is paused
    if( this.world.paused )
      return console.log('replay but is paused...')
  }

  // it should be the same as it started with (since
  // we have no network input yet)
  actions.debugDiff(this.world,diff);
  console.log('======= END OF REEEPLAAAYYYYY ======')
  console.log('')
  console.log('')
}

Game.prototype.apply = function(inputs){
  var world = this.world;
  inputs = inputs || this.inputs.current;
  debug('apply',world.frame,inputs.length)
  // console.log('apply %s',world.name,world.frame,inputs)
  for(var i=0; i < inputs.length;){
    var type = inputs[i++];
    switch(type){
      case World.MOVE:
        var dx = inputs[i++];
        var p = world.paddles.get(world.me.paddle);
        p.current[0] += dx;
        break;
      case World.SHOOT:
        console.log('shooting! frame: %s',world.frame)
        // TODO create a bullet
        // var p = world.paddles.get(world.me.paddle);
        // actions.createBullet(world,p.current[0],p.current[1],10)
        break;
      case World.PAUSE:
        actions.gamePause(world)
        break;
      case World.PLAY:
        actions.gameResume(world)
        break;
      case World.OVER:
        actions.gameOver(world)
        break;
      default:
        console.warn('input not implemented (aborting):',type);
        return;
    }
  }
}

Game.prototype.run = function(timestep){
  debug('run')

  if( this.running )
    throw new Error('already running');

  var timestep = timestep || Game.DEFAULT_TIMESTEP
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
      game.emit('update',world,timestep,game.time);
      game.time += timestep;
      accumulator -= timestep;
    }

    // render
    game.emit('render',world,accumulator/timestep);
  }
  this.running = true;
  loop();
  return this;
}
