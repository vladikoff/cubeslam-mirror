var debug = require('debug')('puppeteer')
  , settings = require('./settings')
  , actions = require('./actions')
  , copy = require('copy')
  , sets = require('./levels/sets')
  , levels = require('./levels');

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
  //if( index < levels[namespace].length ){
    return exports.goto(world,index);
  //} else {
  //  return exports.goto(world,world.level.index);
  //}
}

exports.goto = function(world,index){
  if( !levels[namespace] ){
    throw new Error('namespace "'+namespace+'" not found. call .namespace() first.');
  }

  // default to the same index
  index = index || (world.level && world.level.index) || 0;
  debug('goto %s',world.name,index)

  var level = (index < levels[namespace].length)? levels[namespace][index]:levels[namespace][levels[namespace].length-1];

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
    // plan for the future
    // TODO move to settings?
    var min = settings.data.framerate*(level.minSpawnTime||5)
    var max = settings.data.framerate*(level.maxSpawnTime||10)
    level.nextSpawn = world.frame + world.rand.range(min,max);

  }

  // check if it's time to create an extra
  if( world.frame > level.nextSpawn ){
    //console.log(world.extras.length,level.maxExtras)
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

  if( index > levels[namespace].length-1 ){
    //add more difficulty
    var gain = Math.max(0,(index-(levels[namespace].length-1))*0.3);
    console.log(gain);
    lvl.puck.speed += gain;
    lvl.puck.maxspeed += gain;
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
  lvl.maxExtras = lvl.maxExtras || 3;//Math.min(3,lvl.extras.length);

  return lvl;
}