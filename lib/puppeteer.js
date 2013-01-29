var debug = require('debug')('puppeteer')
  , Emitter = require('emitter')
  , actions = require('./actions')
  , range = require('range')
  , copy = require('copy');

module.exports = Puppeteer;

var FPS = 60;

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
  this.level = 0;
  this.levels = [];
  this.action = 0;
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
  this.action = 0;
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
  this.action = 0;
  this.emit('change',this.level);
  return this;
}

Puppeteer.prototype.prepare = function(level){
  var lvl = this.levels[level];

  // TODO default to settings theme
  lvl.theme = lvl.theme || {};

  // TODO any other defaults?
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
  if( world.over || world.paused )
    return;

  var index = this.level;
  var level = this.levels[index];

  // call the next listener (we might want to level up before checking actions)
  this.emit('update',world,level);

  // we levelled up during the update
  if( this.level !== index )
    return;

  // TODO check if it's time to create an extra
  // TODO if( world.extras)
  // TODO actions.createExtra()
  // TODO while(collides(extra)){ // reposition }

  // TODO check if there's room for obstacles
  // (and there's still obstacles not in the arena)
}

/**
 * Stores all levels in local storage and returns
 * a loadable JSON.
 */
Puppeteer.save = function(pup){
  var levels = [];
  for(var i=0; i < pup.levels.length; i++){
    // TODO optimize the format by converting some arrays
    //      to ranges. Like frame: [0,1,2,3,4] > '0..4'
    levels.push(pup.levels[i]);
  }
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

function rand(arr){
  // using the middle for now to stay predictable
  return arr[Math.round(arr.length/2)]
  // TODO use a seeded random
  return arr[Math.round(Math.random()*arr.length-.5)]
}

function colliding(world,a){
  for(var j=0; j < world.bodies.length; j++){
    var b = world.bodies.values[j]
    if( b === a ) continue; // skip self
    var v = vec.sub(a.velocity,b.velocity);
    var c = poly.collides(a.shape, b.shape, v);
    vec.free(v);
    if( c.willIntersect )
      return c;
  }
}