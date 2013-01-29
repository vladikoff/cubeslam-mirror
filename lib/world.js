var debug = require('debug')('world')
  , stash = require('stash')
  , copy = require('copy')
  , Body = require('./geom-sim/body');

module.exports = World;

// input types
World.DIFF = -2;
World.ACK = -1;
World.MOVE = 0;
World.SHOOT = 1;
World.PAUSE = 2;
World.PLAY = 3;
World.OVER = 4;

function World(){
  debug('create')
  this.frame = 0;
  this.index = 0;

  this.bodies = stash();   // all bodies will be collided in physics
  this.pucks = stash();
  this.extras = stash();
  this.activeExtras = stash();
  this.obstacles = stash();
  this.forces = stash();
  this.bullets = stash();
  this.paddles = stash();
  this.shields = stash();

  this.removed = [];      // any kind of body (should be used from renderer and be pop:ed as soon as it's used)
  this.added = [];        // any kind of body (should be used from renderer and be pop:ed as soon as it's used)
  this.lastHitPucks = {}; // used to look up which paddle a puck hit last
  this.puckBounces = {};  // used to look up how many bounces a puck has

  this.alive = 0;
  this.maxAlive = 0;

  this.host = true;       // TODO can this be removed? we don't have a host anymore
  this.started = false;
  this.paused = true;
  this.over = false;

  this.winner = null;

  this.levelIndex = 0;
  this.level = null;      // states/game.js setupLevels()
  this.me = null;         // states/game.js createGame()
  this.opponent = null;   // states/game.js createGame()

  this.collisions = 0;    // used for statistics
  this.players = {
    a: new Player('HAL (A)'),
    b: new Player('EVE (B)')
  }
}

World.prototype.createBody = function(shape,x,y,flags){
  debug('create body',this.index)
  var body = new Body(shape,x,y,flags);
  body.index = this.index++;
  this.bodies.set(body.index,body);
  this.added.push(body)
  return body;
}

World.prototype.releaseBody = function(body){
  debug('release body',body.index)
  if( !body.removed )
    this.removed.push(body);
  body.removed = true
  return body;
}

World.prototype.copy = function(from){
  debug('copy')

  if( !(from instanceof World) )
    throw new Error('World instance expected');

  this.bodies.copy(from.bodies)
  this.pucks.copy(from.pucks)
  this.extras.copy(from.extras)
  this.activeExtras.copy(from.activeExtras)
  this.obstacles.copy(from.obstacles)
  this.forces.copy(from.forces)
  this.bullets.copy(from.bullets)
  this.paddles.copy(from.paddles)
  this.shields.copy(from.shields)

  // TODO how can we get the renderer to be up
  //      to date? Reset?

  copy(from.added,this.added)
  copy(from.removed,this.removed)
  copy(from.level,this.level)
  copy(from.lastHitPucks,this.lastHitPucks)
  copy(from.puckBounces,this.puckBounces)

  this.frame = from.frame;
  this.index = from.index;
  this.maxAlive = from.maxAlive;
  this.alive = from.alive;
  this.host = from.host;
  this.paused = from.paused;
  this.over = from.over;
  this.winner = from.winner;
  this.collisions = from.collisions;
  this.levelIndex = from.levelIndex;
  this.level = copy(from.level,this.level);

  this.players.a.copy(from.players.a)
  this.players.b.copy(from.players.b)
}


World.prototype.hashCode = function(){
  return Math.round(this.bodies.values.map(function(b){
    return b.current[0] + b.current[1]
         + b.previous[0] + b.previous[1]
         + b.index + (b.removed ? 0 : 1)
         + b.mass + b.damping
         + b.acceleration[0] + b.acceleration[1]
         + b.aabb[0] + b.aabb[1] + b.aabb[2] + b.aabb[3];
  }).reduce(function(s,b){
    return s + b;
  },0) + this.frame + this.levelIndex);
}


World.prototype.reset = function(){
  debug('reset')
  this.frame = 0;
  this.index = 0;

  this.bodies.empty();
  this.obstacles.empty();
  this.pucks.empty();
  this.forces.empty();
  this.bullets.empty();
  this.paddles.empty();
  this.shields.empty();
  this.extras.empty();
  this.activeExtras.empty();

  this.levelIndex = 0;
  this.removed.length = 0;
  this.added.length = 0;
  this.lastHitPucks = {} // TODO would it be better to loop/delete?
  this.puckBounces = {}

  this.alive = 0;
  this.paused = true;
  this.over = false;

  this.winner = null;
  this.collisions = 0;  // used for statistics

  this.players.a.reset();
  this.players.b.reset();
  return this;
}

// default player object
function Player(name){
  this.name = name
  this.shields = []   // shields down (should be set to [1,1,1] on round start and if first one is hit it will turn into [0,1,1] etc)
  this.hits = 0       // shields hit
  this.score = 0      // levels won
  this.power = 1      // multiplier for hitting the ball (> 1 = speedup, < 1 = slow down)
  this.paddle = -1    // set in Simulator#create, an index to a paddle
}
Player.prototype.copy = function(from){
  this.name = from.name;
  this.score = from.score;
  this.power = from.power;
  this.paddle = from.paddle;
  this.hits = from.hits;
  copy(from.shields,this.shields)
}
Player.prototype.reset = function(){
  this.shields.length = 0;
  this.score = 0;
  this.power = 1;
  this.hits = 0;
  return this;
}

// extend Stash with a copy method
stash.Stash.prototype.copy = function(from){
  copy(from.values,this.values)
  copy(from.lookup,this.lookup)
  copy(from.reverse,this.reverse)
  this.length = from.length;
}


