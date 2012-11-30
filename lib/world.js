
module.exports = exports = new World; // global World. modify using reset() etc instead

function World(){
  this.frame = 0;
  this.direction = 1; // physics direction (forward/reverse = 1/-1)
  this.bodies = [];   // all bodies will be collided in physics
  this.pucks = [];
  this.extras = [];
  this.forces = [];
  this.paddles = [];
  this.alive = 0;
  this.sounds = false;
  this.host = true;
  this.webcam = false; // true after getUserMedia was successful.
  this.paused = true;
  this.over = false;
  this.renderer = null; // set in PlayState
  this.bounds = null;   // set in PlayState
  this.me = null;       // set in Simulator#create, points to the own player
  this.opponent = null; // set in Simulator#create, points to the other player
  this.collisions = 0;  // used for statistics
  this.players = {
    a: new Player('HAL'),
    b: new Player('EVE')
  }
}
World.prototype.reset = function(){
  this.frame = 0;
  this.direction = 1;
  this.bodies.length = 0;
  this.pucks.length = 0;
  this.forces.length = 0;
  this.paddles.length = 0;
  this.extras.length = 0;
  this.alive = 0;
  this.paused = true;
  this.over = false;
  this.collisions = 0;  // used for statistics
  this.players.a.reset();
  this.players.b.reset();
  if( this.renderer )
    this.renderer.reset();
  return this;
}

// default player object
function Player(name){
  this.name = name
  this.hits = []
  this.score = 0
  this.paddle = -1    // set in Simulator#create, an index to a paddle
  this.power = 1      // multiplier for hitting the ball (> 1 = speedup, < 1 = slow down)
}
Player.prototype.reset = function(){
  this.score = 0;
  this.power = 1;
  this.hits.length = 0;
  return this;
}

