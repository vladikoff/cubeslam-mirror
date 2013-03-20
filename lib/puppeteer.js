var debug = require('debug')('puppeteer')
  , actions = require('./actions')
  , copy = require('copy')
  , sets = require('./levels/sets')
  , levels = require('./levels');

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

  // generate the nextFrame
  if( level.extras.nextFrame < 0 ){
    var min = 60*(level.extras.minSpawnTime||0) || MIN_EXTRA_SPAWN_TIME
    var max = 60*(level.extras.maxSpawnTime||0) || MAX_EXTRA_SPAWN_TIME
    level.extras.nextFrame = world.frame + world.rand.range(min,max);
  }

  // check if it's time to create an extra
  if( world.frame > level.extras.nextFrame ){
    if( world.extras.length >= level.extras.max ){
      actions.destroyFirstExtra(world);
    }

    actions.createRandomExtra(world);

    // Reset next frame
    // (will be regenerated next update())
    level.extras.nextFrame = -1;
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
  // TODO Pool?
  var lvl = copy(level);

  // set the index of the level
  // (might be good to know for .goto())
  lvl.index = index;

  // pick a random set
  if( Array.isArray(lvl.set) ){
    lvl.set = world.rand.choice(lvl.set);
  }

  // find obstacles and forces in sets
  if( sets[lvl.set] ){
    copy(sets[lvl.set],lvl)
  }

  // optional extras, obstacles and forces
  lvl.extras = lvl.extras || {available:[],positions:[]}
  lvl.obstacles = lvl.obstacles || []
  lvl.forces = lvl.forces || []

  // TODO move positions into sets instead of level

  // make available if destroyed
  for(var i=0; i < lvl.obstacles.length; i++){
    lvl.obstacles[i].used = false;
  }

  // TODO validate the extra ids so they exist


  // When next extra should be added
  // set to -1 and reset on first update()
  lvl.extras.nextFrame = -1;


  // make sure the number of extras positions
  // must be more than `maxExtras` (3) or
  // available extras.
  // TODO maybe a setting?
  lvl.extras.max = Math.min(3,lvl.extras.available.length);

  return lvl;
}