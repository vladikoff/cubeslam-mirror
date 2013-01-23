var stash = require('stash');

module.exports = World;

// input types
World.ACK = -1;
World.MOVE = 0;
World.SHOOT = 1;
World.PAUSE = 2;
World.PLAY = 3;
World.OVER = 4;

function World(){
  this.frame = 0;

  this.puckIndex = 0;
  this.bulletIndex = 0;

  this.bodies = stash();   // all bodies will be collided in physics
  this.pucks = stash();
  this.extras = stash();
  this.activeExtras = stash();
  this.obstacles = stash();
  this.forces = stash();
  this.bullets = stash();
  this.paddles = stash();

  this.removed = [];      // any kind of body (should be used from renderer and be pop:ed as soon as it's used)
  this.added = [];        // any kind of body (should be used from renderer and be pop:ed as soon as it's used)
  this.lastHitPucks = {}; // used to look up which paddle a puck hit last

  this.alive = 0;
  this.maxAlive = 0;

  this.host = true;       // TODO can this be removed? we don't have a host anymore
  this.paused = true;
  this.over = false;

  this.winner = null;

  this.level = null;      // states/game.js setupLevels()
  this.me = null;         // states/game.js createGame()
  this.opponent = null;   // states/game.js createGame()

  this.collisions = 0;    // used for statistics
  this.players = {
    a: new Player('HAL (A)'),
    b: new Player('EVE (B)')
  }
}


World.prototype.reset = function(){
  console.log('world reset')
  this.frame = 0;
  this.puckIndex = 0;
  this.bulletIndex = 0;
  this.bodies.empty();
  this.obstacles.empty();
  this.pucks.empty();
  this.forces.empty();
  this.bullets.empty();
  this.paddles.empty();
  this.extras.empty();
  this.activeExtras.empty();
  this.removed.length = 0;
  this.added.length = 0;
  this.lastHitPucks = {} // TODO would it be better to loop/delete?
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
  this.hits = []
  this.score = 0
  this.power = 1      // multiplier for hitting the ball (> 1 = speedup, < 1 = slow down)
  this.paddle = -1    // set in Simulator#create, an index to a paddle
}
Player.prototype.reset = function(){
  this.score = 0;
  this.power = 1;
  this.hits.length = 0;
  return this;
}

