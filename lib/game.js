var requestAnimationFrame = require('request-animation-frame')
  , Emitter = require('emitter')
  , debug = require('debug')('game')
  , settings = require('./settings')
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

Game.TIMESTEP = 1/60;

function Game(renderer){
  this.world = new World();
  this.physics = new Physics();
  this.inputs = new Inputs();
  this.puppeteer = new Puppeteer(this.actions)
  this.ai = new AI();

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
  this.replaying = false;

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
  this.inputs.reset()
  this.world.reset();
  this.puppeteer.goto(0)
  if( this.renderer )
    this.renderer.reset();
}

Game.prototype.update = function(){
  this.emit('update',this.world,Game.TIMESTEP);
}

// ctx.game.replay(ctx.initial.world,inputs[,150])
Game.prototype.replay = function(world,inputs,until){
  console.log('')
  console.log('')
  console.log('========== REPLAY =========')
  console.log('FROM LEVEL %s FRAME %s GAME %s',world.levelIndex,world.frame,world.name)
  console.log('TO   LEVEL %s FRAME %s GAME %s',this.world.levelIndex,until || this.world.frame,this.world.name)
  this.replaying = true;
  until = until || this.world.frame;
  var diff = actions.debugDiff(this.world);
  actions.debugDiff(world,diff)
  this.world.copy(world);
  this.puppeteer.goto(world.levelIndex)
  var inputFrames = this.inputs.frames.length;
  var inputHistory = this.inputs.history.length;
  this.inputs.reset()
  settings.data.sounds = false;

  var Renderer = this.renderer.constructor;
  var r = new Renderer(document.getElementById('canv-debug'))

  var ctx = {frame: 0, index: 0}
  while(this.world.frame < until){
    inputs.read(this.world.frame,this.inputs.current,ctx)
    // console.log('replay read inputs at frame %s',this.world.frame,this.inputs.current)
    this.update()

    r.render(this.world,0)

    // TODO just give up if paused too long
    if( this.world.paused )
      return console.log('replay but is paused...')
  }

  console.log('======= END OF REEEPLAAAYYYYY ======')
  console.log('AT   LEVEL %s FRAME %s GAME %s',this.world.levelIndex,this.world.frame,this.world.name)
  console.log('inputs frame counts: %s/%s',this.inputs.frames.length,inputFrames)
  console.log('inputs history counts: %s/%s',this.inputs.history.length,inputHistory)
  console.log('')
  console.log('')
  this.replaying = false;
  settings.data.sounds = true;
  // wasRunning && this.run();


  // it should be the same as it started with (since
  // we have no network input yet)
  if( diff !== actions.debugDiff(this.world,diff) ){
    throw new Error('state diverged!')
  }
}

Game.prototype.apply = function(inputs){
  var world = this.world;
  inputs = inputs || this.inputs.current;
  debug('apply',world.frame,inputs.length)
  for(var i=0; i < inputs.length;){
    var type = inputs[i++];
    switch(type){
      case World.MOVE:
        actions.movePaddle(world,inputs[i++])
        break;
      case World.SHOOT:
        actions.createBullet(world,10)
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

Game.prototype.run = function(){
  debug('run')

  if( this.running )
    throw new Error('already running');

  var timestep = Game.TIMESTEP
    , currentTime = Date.now() / 1000
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

    if (game.replaying)
      console.log('REPLAYING IN LOOP! NO!')

    // update
    accumulator += deltaTime;
    while(accumulator >= timestep) {
      game.emit('update',world,timestep);
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
