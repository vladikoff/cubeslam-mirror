var debug = require('debug')('puppeteer')
  , Emitter = require('emitter')
  , actions = require('./actions')
  , settings = require('./settings')
  , colliding = require('./collisions').colliding
  , copy = require('copy')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

module.exports = Puppeteer;

Puppeteer.FPS = 30;

/**
 * The puppeteer controls the levels of the game.
 *
 * While some logic is handled by the `next`-event most of the
 * level-specific logic is done through level configuration JSON.
 *
 * Add levels to it and it will move up the ladder whenever
 * desired (by time? by hits? by speed?).
 *
 * Each level is a JSON that defines what (add/remove extra/obstacle, resize
 * paddles, change theme/colors?) and when (at frame, within a range of frames,
 * at collision with something, randomly (w. x % chance/frame)).
 *
 *
 *
 * Events:
 *
 *   - `up` [level] is being emitted anytime the game is levelled up.
 *   - `down` [level] is being emitted anytime the game is levelled down.
 *   - `change` [level] is being emitted anytime the game changed level (both up and down).
 *   - `added` [level] is emitted whenever a new level has been added.
 *   - `game over` [lastLevel] should be emitted whenever the game should stop
 *                 entirely.
 *   - `update` [world] should be used to decide when the level is over, or should change.
 *
 *
 * Example:
 *
 *    // SingleState
 *    p.on('update',function(world){
 *      // move to the next level when AI was hit 3 times
 *      if( world.opponent.hits.length == 3 )
 *        return this.up()
 *
 *      // game over when hit 3 times
 *      if( world.me.hits.length == 3 )
 *        return this.emit('game over')
 *    })
 *
 *    // MultiState
 *    p.on('update',function(world){
 *      // move to the next level every 3rd time a paddle is hit
 *      if( world.paddles.a.hits >= 3 || world.paddles.b.hits >= 3 )
 *        return this.up()
 *
 *      // game over if either player has been hit 3 times
 *      if( world.me.hits.length >= 3 && world.opponent.hits.length >= 3 )
 *        return this.emit('game over')
 *    })
 *
 *
 */
function Puppeteer(){
  debug('create')
  this.level = -1;
  this.levels = [];
}

Emitter(Puppeteer.prototype);

// game over
Puppeteer.prototype.over = function(){
  debug('over')
  this.emit('game over',this.level);
}


// move to the next level (if no more levels restart on the same level)
Puppeteer.prototype.up = function(){
  debug('up')
  var next = Math.min(this.level+1,this.levels.length-1);
  this.goto(next);
  this.emit('up',next);
}

// move down to the previous level (if no previous restart on the same level)
Puppeteer.prototype.down = function(){
  debug('down')
  var next = Math.max(this.level-1,0);
  this.goto(next);
  this.emit('down',next);
}

Puppeteer.prototype.restart = function(level){
  level = typeof level == 'number' ? level : this.level;
  this.prepare(level)
  this.level = level;
  this.rand = random(1);
  return this;
}

// updates and merges the level settings with the
// global settings. Also applies the theme.
// Should only be used internally. Use #up() or
// #down() instead.
Puppeteer.prototype.goto = function(level){
  debug('goto',level)
  this.prepare(level)
  this.level = level;
  this.emit('change',this.level);
  return this;
}

Puppeteer.prototype.prepare = function(level){
  var lvl = this.levels[level];

  // TODO default to settings theme
  lvl.theme = lvl.theme || {};

  // TODO validate the number of extras positions
  //      must be more than `maxExtras` (3) or
  //      available extras.

  // The number of frames passed
  lvl.extras.frame = 0;
  // The when next extra should be added
  lvl.extras.nextFrame = 1*Puppeteer.FPS;
}

Puppeteer.prototype.load = function(levels){
  debug('load')
  levels = levels || window.localStorage.levels;
  if( typeof levels == 'string' )
    levels = JSON.parse(levels);
  for(var i=0; i < levels.length; i++)
    this.add(levels[i],i);
  return this;
}

// adds a level to the stack and goes to it
Puppeteer.prototype.add = function(level,i){
  debug('add',i)
  level = Puppeteer.parse(level,this.levels[i]);
  if( typeof i == 'number' ){
    this.levels[i] = level;
  } else {
    i = this.levels.length;
    this.levels[i] = level;
    this.emit('added',i);
  }
  return this;
}

// call this every frame
Puppeteer.prototype.update = function(world){
  // don't run if game over or paused
  if( this.level < 0 || world.over || world.paused )
    return;

  var index = this.level
    , level = this.levels[index];

  // call the next listener (we might want to level up before checking actions)
  this.emit('update',world,level);

  // we levelled up during the update
  if( this.level !== index )
    return;

  // check if it's time to create an extra
  if( level.extras.frame++ > level.extras.nextFrame ){
    // TODO this should be a setting, maybe even a level setting.
    var maxExtras = Math.min(3,level.extras.available.length);

    // dumt count since some bodies are removed but
    // not deleted from world.bodies/world.extras etc
    // TODO figure out why!
    var countExtras = 0;
    for(var i=0; i<world.extras.length;i++)
      if( !world.extras.values[i].removed )
        countExtras++;
    if( countExtras > maxExtras ){
      console.log('more than %s extras (%s) in the arena, removing first one',maxExtras,world.extras.length)
      actions.destroyFirstExtra(world);
    }

    actions.createRandomExtra(world,level);

    // Add some time until the next extra
    // TODO randomize this "between 5 and 10 seconds"
    level.extras.nextFrame += 1*Puppeteer.FPS;
  }

  // check if there's room for obstacles
  // (and there's still obstacles not in the arena)
  if( level.obstacles.length > world.obstacles.length ){
    var obstacle = level.obstacles[world.obstacles.length];
    var body = actions.createObstacle(world,obstacle.id,obstacle.x,obstacle.y);
    if(colliding(world,body))
      actions.destroyObstacle(world,body);
  }
}

/**
 * Stores all levels in local storage and returns
 * a loadable JSON.
 */
Puppeteer.save = function(pup){
  var levels = [];
  for(var i=0; i < pup.levels.length; i++)
    levels.push(pup.levels[i]);
  return window.localStorage.levels = JSON.stringify(levels,null,2);
}

/**
 * Loads the levels stored by Puppeteer.save() and
 * returns a Puppeteer instance.
 */
Puppeteer.load = function(levels){
  return new Puppeteer().load(levels)
}

/**
 * Parses a level into an object thats easily
 * consumed during the update loop.
 *
 * Used by #add().
 */
Puppeteer.parse = function(level,into){
  if( typeof level == 'string' )
    level = JSON.parse(level);
  return copy(level,into||{})
}

