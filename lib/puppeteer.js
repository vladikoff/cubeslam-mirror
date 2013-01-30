var debug = require('debug')('puppeteer')
  , Emitter = require('emitter')
  , actions = require('./actions')
  , settings = require('./settings')
  , copy = require('copy')
  , random = require('seed-random')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

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

  // TODO any other defaults?

  // The number of frames passed since last added extra
  lvl.extras.frame = 0;
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
  if( level.extras.frame++ > 10*FPS ){
    var extra = rand(level.extras);

    // TODO remove any previous extraneous extra...
    if( world.extras.length > 3 ){
      console.log('TODO remove extra')
    }

    // TODO avoid bounds collisions (rnd*(aw-unit)+unit/2)
    var x = rnd()*settings.data.arenaWidth
      , y = rnd()*settings.data.arenaHeight;
    var body = actions.createExtra(world,extra.id,x,y)
    // TODO to avoid lookups maybe add a Body#data which
    //      can hold the level extra it refers to?

    // this should be ok w. max 3 extras and a few pucks?
    // TODO add a max-loop just in case
    while(colliding(world,body)){
      var nx = rnd()*settings.data.arenaWidth
        , ny = rnd()*settings.data.arenaHeight
      poly.translate(body.shape, nx-x, ny-y);
      body.current[0] = body.previous[0] = x = nx;
      body.current[1] = body.previous[1] = y = ny;
    }
    level.extras.frame = 0;
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


var rnd = random(1);
function rand(arr){
  return arr[Math.round(rnd()*arr.length-.5)]
}
function shuffle(arr){
  return arr.concat().sort(rnd);
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