var debug = require('debug')('puppeteer')
  , Emitter = require('emitter')
  , actions = require('./actions')
  , copy = require('copy')
  , sets = require('./levels/sets')
  , $ = require('jquery');

module.exports = Puppeteer;

Puppeteer.MIN_EXTRA_SPAWN_TIME = 60*5; // frames (~10s)
Puppeteer.MAX_EXTRA_SPAWN_TIME = 60*10; // frames (~5s)

/**
 * The puppeteer controls the levels of the game.
 *
 * Events:
 *
 *   - `up` [level] is being emitted anytime the game is levelled up.
 *   - `down` [level] is being emitted anytime the game is levelled down.
 *   - `change` [level] is being emitted anytime the game changed level (both up and down).
 *   - `added` [level] is emitted whenever a new level has been added.
 */
function Puppeteer(){
  debug('create')
  this.level = -1;
  this.levels = [];
}

Emitter(Puppeteer.prototype);

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

  return this;
}

// updates and merges the level settings with the
// global settings.
// Should only be used internally. Use #up() or
// #down() instead.
Puppeteer.prototype.goto = function(level){
  debug('goto',level)
  this.prepare(level)
  if( level !== this.level ){
    this.level = level;
    this.emit('change',this.level);
  }
  return this;
}

Puppeteer.prototype.prepare = function(level){
  var lvl = this.levels[level];

  // find obstacles and forces in sets
  if( Array.isArray(lvl.set) ){
    // TODO how to random without world?
    // (move this into update()?)
  } else if( sets[lvl.set] ){
    copy(sets[lvl.set],lvl)
  }

  // optional extras, obstacles and forces
  lvl.extras = lvl.extras || {available:[],positions:[]}
  lvl.obstacles = lvl.obstacles || []
  lvl.forces = lvl.forces || []

  // make available if destroyed
  for(var i=0; i < lvl.obstacles.length; i++){
    lvl.obstacles[i].used = false;
  }

  // TODO validate the number of extras positions
  //      must be more than `maxExtras` (3) or
  //      available extras.

  // TODO validate the extra ids so they exist


  // When next extra should be added
  // set to -1 and reset on first update()
  lvl.extras.nextFrame = -1;
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

  // first time we need to generate the nextFrame
  // (we need `world.random()`)
  if( level.extras.nextFrame < 0 ){
    var min = 60*(level.extras.minSpawnTime||0) || Puppeteer.MIN_EXTRA_SPAWN_TIME
    var max = 60*(level.extras.maxSpawnTime||0) || Puppeteer.MAX_EXTRA_SPAWN_TIME
    level.extras.nextFrame = world.frame + world.rand.range(min,max);
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
  if( world.frame > 0 ){
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

var listeners = {};

/**
 * Attaches the puppeteer to a game by adding the appropriate
 * event listeners.
 *
 * @param  {Game} game
 */
Puppeteer.prototype.attach = function(game){
  var l = listeners[game.world.name] || {
    onchangelevel: function(level){
      // keep a reference to the current level in world
      // (it's just easier in the actions this way)
      game.world.level = this.levels[level]

      // restart game
      // adds start class for transition delay purposes
      $("#level-prompt h2 span")
        .html(level+1)
        .closest('section')
        .toggleClass('start', level==0);
      $("#level").html(level+1);

      // make some noise
      dmaf.tell('level_'+level);

      // update theme
      actions.emit('renderer','changeLevel',{level: level})
    },
    onupdate: this.update.bind(this)
  }

  // remove listener first, only one per game
  this.off('change',l.onchangelevel)
  game.off('pre update',l.onupdate)

  // now add listeners
  this.on('change',l.onchangelevel)
  game.on('pre update',l.onupdate)

  listeners[game.world.name] = l;
}

Puppeteer.prototype.detach = function(game){
  if( !game ) return;

  var l = listeners[game.world.name];
  if( l ){
    this.off('change',l.onchangelevel)
    game.off('pre update',l.onupdate)
  }
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

