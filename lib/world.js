
module.exports = exports = new World; // global World. modify using reset() etc instead

function World(){
  this.frame = 0;
  this.direction = 1; // physics direction (forward/reverse = 1/-1)
  this.pucks = [];
  this.forces = [];
  this.paddles = [];
  this.alive = 0;
  this.renderer = null; // set in PlayState
  this.bounds = null;   // set in PlayState
  this.host = false;    // set in Simulator#create
  this.me = null;       // set in Simulator#create, points to the own player
  this.players = {
    a: new Player('HAL'),
    b: new Player('EVE')
  }
}
World.prototype.reset = function(){
  this.frame = 0;
  this.direction = 1;
  this.pucks.length = 0;
  this.forces.length = 0;
  this.paddles.length = 0;
  this.alive = 0;
  this.players.a.reset();
  this.players.b.reset();
  return this;
}

// default player object
function Player(name){
  this.type = null; //to know if it's A or B
  this.name = name
  this.host = false
  this.hits = []
  this.score = 0
  this.paddle = null // should be an index in `this.world.paddles`
  this.power = 1 // multiplyer for hitting the ball (> 1 = speedup, < 1 = slow down)
}
Player.prototype.reset = function(){
  this.score = 0;
  this.power = 1;
  return this;
}

