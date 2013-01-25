var Emitter = require('emitter')
  , actions = require('./actions')
  , range = require('range');

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
  this.level = 0;
  this.levels = [];
  this.action = 0;
  Emitter.call(this)
}
Puppeteer.prototype = new Emitter;

// game over
Puppeteer.prototype.over = function(){
  this.emit('game over',this.level);
}


// move to the next level (if no more levels restart on the same level)
Puppeteer.prototype.up = function(){
  var next = Math.min(this.level+1,this.levels.length-1);
  this.goto(next);
  this.emit('up',next);
}

// move down to the previous level (if no previous restart on the same level)
Puppeteer.prototype.down = function(){
  var next = Math.max(this.level-1,0);
  this.goto(next);
  this.emit('down',next);
}

// updates and merges the level settings with the
// global settings. Also applies the theme.
// Should only be used internally. Use #up() or
// #down() instead.
Puppeteer.prototype.goto = function(level){
  var lvl = this.levels[level];

  // TODO default to settings theme
  lvl.theme = lvl.theme || {};

  // TODO any other defaults?

  // TODO don't break the source level
  //      (now the instance is modified
  //       instead of a copy)
  for(var i=0; i < lvl.actions.length; i++ ){
    var act = lvl.actions[i];

    // in case of a range of frames
    // pick a random one
    if( Array.isArray(act.frame) )
      act.frame = rand(act.frame);

    // converts time to frames
    // but this is only necessary
    // because of the level editor
    // which uses time only
    if( typeof act.time == 'number' )
      act.frame = act.time * FPS;

    // clear that they've been called
    delete act.called;
  }

  // sort actions by first frame
  lvl.actions.sort(function(a,b){
    var af = a.frame[0] || a.frame
    var bf = b.frame[0] || b.frame
    return af - bf;
  })

  console.log('goto',lvl);

  this.level = level;
  this.action = 0;
  this.emit('change',this.level);
  return this;
}

Puppeteer.prototype.load = function(levels){
  levels = levels || window.localStorage.levels;
  if( typeof levels == 'string' )
    levels = JSON.parse(levels);
  for(var i=0; i < levels.length; i++)
    this.add(levels[i],i);
  return this;
}

// adds a level to the stack and goes to it
Puppeteer.prototype.add = function(level,i){
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

  var level = this.levels[this.level];

  // call the next listener (we might want to level up before checking actions)
  this.emit('update',world,level);

  // apply any actions that applies to this frame
  for(var i=this.action; i < level.actions.length; i++ ){
    var act = level.actions[i];

    // see if this is the frame
    if( world.frame < act.frame )
      continue;

    // this action already happened
    if( act.called )
      continue;

    // no need to check against future frames
    if( world.frame > act.frame + 1 ){
      console.log('world frame (%s) has passed action frame (%s)',world.frame,act.frame)
      break;
    }

    // make sure it exists
    if( actions.hasOwnProperty(act.action) ){
      console.log('called action "%s" at frame %s',act.action,world.frame,act.params)
      actions[act.action].apply(actions,[world].concat(act.params));

      // we reached this action! next time we'll start
      // here so we don't have to loop so much
      this.action = i;
      act.called = true;

    } else console.warn('action "%s" does not exist',act.action);

  }
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

  // (backwards so we can remove actions easier)
  for(var i=level.actions.length-1; i >= 0; i--){
    var act = level.actions[i]
      , rm = false;
    for(var k in act){
      // parse any range values
      var rng;
      if( typeof act[k] == 'string' && (rng = range(act[k])))
        act[k] = rng.values;

      // convert time to frames
      if( k == 'time' ){
        if( typeof act[k] == 'number' ){
          act.frame = Math.round(act[k]*FPS);
        } else {
          console.warn('only time as number is supported. ignoring action')
          rm = true;
          break;
        }
      }
    }

    // make sure the action has a frame
    if( !act.hasOwnProperty('frame') ){
      console.warn('action is missing frame. ignoring action')
      rm = true;
    }

    // make sure action exists
    if( !actions.hasOwnProperty(act.action) ){
      console.warn('action "%s" does not exist. ignoring action',act.action,actions)
      rm = true;
    }
    rm && level.actions.splice(i,1);
  }

  return copy(level,into||{})
}

function copy(b,a){
  for(var k in b){
    if( Array.isArray(b[k]) )
      a[k] = copy(b[k],a[k]||[])
    else if( typeof b[k] == 'object' )
      a[k] = copy(b[k],a[k]||{})
    else
      a[k] = b[k]
  }
  return a;
}


function rand(arr){
  // using the middle for now to stay predictable
  return arr[Math.round(arr.length/2)]
  // TODO use a seeded random
  return arr[Math.round(Math.random()*arr.length-.5)]
}