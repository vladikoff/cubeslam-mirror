var debug = require('debug')('puppeteer')
  , Emitter = require('emitter')
  , actions = require('./actions')
  , copy = require('copy');

module.exports = Puppeteer;

Puppeteer.MIN_EXTRA_SPAWN_TIME = 60*5; // frames (~10s)
Puppeteer.MAX_EXTRA_SPAWN_TIME = 60*10; // frames (~5s)

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
 * paddles) and when (at frame, within a range of frames,
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

  dmaf.tell("level_"+ next);

  this.goto(next);
  this.emit('up',next);
}

// move down to the previous level (if no previous restart on the same level)
Puppeteer.prototype.down = function(){
  debug('down')
  var next = Math.max(this.level-1,0);

  dmaf.tell("level_"+ next);

  this.goto(next);
  this.emit('down',next);
}

Puppeteer.prototype.restart = function(level){
  level = typeof level == 'number' ? level : this.level;
  this.prepare(level)
  this.level = level;

  dmaf.tell("level_"+ this.level);

  this.rand = random(1);
  return this;
}

// updates and merges the level settings with the
// global settings.
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

  // optional extras, obstacles and forces
  lvl.extras = lvl.extras || []
  lvl.obstacles = lvl.obstacles || []
  lvl.forces = lvl.forces || []

  //make available if destroyed
  for (var i = lvl.obstacles.length - 1; i >= 0; i--) {
    lvl.obstacles[i].used = false;
  };

  // TODO validate the number of extras positions
  //      must be more than `maxExtras` (3) or
  //      available extras.

  // TODO validate the extra ids so they exist


  // When next extra should be added
  // set to -1 and reset on first update()
  lvl.extras.nextFrame = -1;
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
  if( world.state !== 'playing' )
    return;

  var index = this.level
    , level = this.levels[index];

  // call the next listener (we might want to level up before checking actions)
  this.emit('update',world,level);

  // we levelled up during the update
  if( this.level !== index )
    return;

  // first time we need to generate the nextFrame
  // (we need `world.random()`)
  if( level.extras.nextFrame < 0 ){
    level.extras.nextFrame = world.frame + world.rand.range(Puppeteer.MIN_EXTRA_SPAWN_TIME,Puppeteer.MAX_EXTRA_SPAWN_TIME);
  }

  // check if it's time to create an extra
  if( world.frame > level.extras.nextFrame ){
    // TODO this should be a setting, maybe even a level setting.
    var maxExtras = Math.min(3,level.extras.available.length);

    if( world.extras.length >= maxExtras ){
      // console.log('more than %s extras (%s) in the arena, removing first one',maxExtras,world.extras.length)
      actions.destroyFirstExtra(world);
    }

    actions.createRandomExtra(world,level);

    // Reset next frame
    // (will be regenerated next update())
    level.extras.nextFrame = -1;
  }

  // check if there's room for obstacles
  // (and there's still obstacles not in the arena)
  if(world.frame > 0) {
    for(var i=world.obstacles.length; i<level.obstacles.length;i++){
      if(!level.obstacles[i].used) {
        var added = actions.createNextObstacle(world,level)
        if(added) level.obstacles[i].used = true;
      }
    }

    for(var i=world.forces.length; i<level.forces.length;i++){
      actions.createNextForce(world,level)
    }
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

