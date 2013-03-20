var debug = require('debug')('puppeteer')
  , actions = require('./actions')
  , copy = require('copy')
<<<<<<< HEAD
  , dmaf = require('./dmaf.min');

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
=======
  , sets = require('./levels/sets')
  , levels = require('./levels');
>>>>>>> 0fecb7e8eface5e148f3ffe8c0699fd994ddf309

// TODO move to settings?
var MIN_EXTRA_SPAWN_TIME = 60*5; // frames (~10s)
var MAX_EXTRA_SPAWN_TIME = 60*10; // frames (~5s)

var namespace = null;

exports.namespace = function(id){
  debug('namespace',id)
  namespace = id;
  return exports;
}

// convenience method to go to the next level
exports.up = function(world){
  debug('up %s',world.name)
  var index = world.level.index + 1;
  if( index < levels[namespace].length ){
    return exports.goto(world,index);
  } else {
    return exports.goto(world,world.level.index);
  }
}

exports.goto = function(world,index){
  if( !levels[namespace] ){
    throw new Error('namespace "'+namespace+'" not found. call .namespace() first.');
  }

  // default to the same index
  index = index || (world.level && world.level.index) || 0;
  debug('goto %s',world.name,index)

  var level = levels[namespace][index];

  // exists?
  if( !level ){
    throw new Error('level "'+index+'" not found.');
  }

  // prepare & set level on world
  world.level = prepare(world,level,index);
  return exports;
}

exports.update = function(world){
  // don't run if game over or paused
  if( world.state !== 'playing' )
    return;

  var level = world.level;

  // generate the nextSpawn
  if( level.nextSpawn < 0 ){
    var min = 60*(level.minSpawnTime||0) || MIN_EXTRA_SPAWN_TIME
    var max = 60*(level.maxSpawnTime||0) || MAX_EXTRA_SPAWN_TIME
    level.nextSpawn = world.frame + world.rand.range(min,max);
  }

  // check if it's time to create an extra
  if( world.frame > level.nextSpawn ){
    if( world.extras.length >= level.maxExtras ){
      actions.destroyFirstExtra(world);
    }

    actions.createRandomExtra(world);

    // Reset next spawn frame
    // (will be regenerated next update())
    level.nextSpawn = -1;
  }

  // check if there's room for obstacles
  // (and there's still obstacles not in the arena)
  if( world.frame > 0 ){
    for(var i=world.obstacles.length; i<level.obstacles.length;i++){
      // TODO this .used property is probably not a good idea.
      //      maybe keep two arrays instead?
      if(!level.obstacles[i].used) {
        var added = actions.createNextObstacle(world)
        if(added) level.obstacles[i].used = true;
      }
    }

    for(var i=world.forces.length; i<level.forces.length;i++){
      actions.createNextForce(world)
    }
  }
}

function prepare(world,level,index){
  debug('prepare %s',world.name,index)

  // TODO Pool?
  var lvl = copy(level);

  // set the index of the level
  // (might be good to know for .goto())
  lvl.index = index;

  // special "random" case
  if( lvl.set === 'random' ){
    debug('set random')
    lvl.set = sets.random;
  }

  // pick a random set
  if( Array.isArray(lvl.set) ){
    lvl.set = world.rand.choice(lvl.set);
    debug('set from array',lvl.set)
  }

  // find obstacles and forces in sets
  if( sets[lvl.set] ){
    copy(sets[lvl.set],lvl)
  } else if(lvl.set){
    throw new Error('set "'+lvl.set+'" was not found')
  }

  // in case the level defines positions
  // overwrite with those
  if( level.positions ){
    lvl.positions = copy(level.positions,lvl.positions);
  }

  // optional extras, obstacles and forces
  lvl.extras = lvl.extras || []
  lvl.obstacles = lvl.obstacles || []
  lvl.forces = lvl.forces || []
  lvl.positions = lvl.positions || []

  // make available if destroyed
  for(var i=0; i < lvl.obstacles.length; i++){
    lvl.obstacles[i].used = false;
  }

  // TODO validate the extra ids so they exist

  // TODO validate the existence of AI?

  // When next extra should be added
  // set to -1 and reset on first update()
  lvl.nextSpawn = -1;


  // make sure the number of extras positions
  // must be more than `maxExtras` (3) or
  // available extras.
  // TODO maybe a setting?
  lvl.maxExtras = Math.min(3,lvl.extras.length);

  return lvl;
}
