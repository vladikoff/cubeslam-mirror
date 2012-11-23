var Emitter = require('emitter')
  , range = require('range');

module.exports = Puppeteer;

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
 *   - `added` [level] is emitted whenever a new level has been added.
 *   - `game over` [lastLevel] should be emitted whenever the game should stop
 *                 entirely.
 *   - `next` [world] is a required event to listen to and the
 *            Puppeteer will throw if it has no listeners on
 *            the first update. It should be used to decide when
 *            the level is over, or should change.
 *
 *
 * Example:
 *
 *    // SingleState
 *    p.on('next',function(world){
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
 *    p.on('next',function(world){
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
  this.initialized = false;
  Emitter.call(this)
}
Puppeteer.prototype = new Emitter;

// move to the next level (if no more levels restart on the same level)
Puppeteer.prototype.up = function(){
  if( this.level + 1 < this.levels.length )
    this.level++;
  this.emit('up',this.level);
}

// move down to the previous level (if no previous restart on the same level)
Puppeteer.prototype.down = function(){
  if( this.level - 1 >= 0 )
    this.level--;
  this.emit('down',this.level);
}

// adds a level to the stack and returns the index of it
Puppeteer.prototype.add = function(level){
  if( typeof level == 'string' )
    level = JSON.parse(level);

  // TODO parse/initialize the level somehow

  return this.levels.push(level);
}

// call this every frame
Puppeteer.prototype.update = function(world){
  var level = this.levels[this.level];

  // check that we have a "next"-listener on the
  // first call.
  if( !this.initialized ){
    this.initialized = true;
    if( !this.hasListener('next') )
      throw new Error('A "next"-listener is required.')
  }

  // TODO depending on world.frame do things from the current level.

}


// example level json:
var level1 = {
  name: 'Level 1', // optional (not really used anywhere right now but makes sense to have)
  theme: {
    arenaColor: 0xb03425,
    puckColor: 0xefce06,
    shieldColor: 0xffffff,
  },
  players: {
    a: {
      // TODO how will we know the span of the level?
      power: "1.30...2.00",
    }
  },
  events: [
    {
      // keep it there during 30 frames
      start: 0, end: 30,
      // positions are always 0-1
      x: .3, y: .1,
      // i.e. Extras.get(id)
      id: 'hexagon'
    },

    {
      // no end means until end of level
      start: 1000,

      // no position means random non-conflicting x/y

      // i.e. Extras.get(id)
      id: 'speedball'
    }
  ]
}



