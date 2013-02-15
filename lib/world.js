var debug = require('debug')('world')
  , stash = require('stash')
  , copy = require('copy')
  , Body = require('./geom-sim/body')
  , Random = require('./support/rand');

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

  // generate seed from pathname
  var seed = location.pathname.split('')
            .map(function(c){return c.charCodeAt(0)})
            .reduce(function(s,c){return s+c})*location.pathname.length;

  // keep a seeded random for the world!
  // (don't use World#rand, use World#random() instead)
  this.rand = new Random(seed);

  this.bodies = stash();   // all bodies will be collided in physics
  this.pucks = stash();
  this.extras = stash();
  this.activeExtras = stash();
  this.obstacles = stash();
  this.forces = stash();
  this.bullets = stash();
  this.paddles = stash();
  this.shields = stash();

  this.lastHitPucks = {}; // used to look up which paddle a puck hit last
  this.puckBounces = {};  // used to look up how many bounces a puck has

  this.alive = 0;
  this.maxAlive = 0;

  this.host = true;       // TODO can this be removed? we don't have a host anymore
  this.paused = true;
  this.over = false;
  this.multiplayer = false;
  this.runLevels = false;

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

World.prototype.random = function(){
  return this.rand.random()
}

World.prototype.createBody = function(shape,x,y,flags){
  debug('create body',this.index)
  var body = new Body(shape,x,y,flags);
  body.index = this.index++;
  this.bodies.set(body.index,body);
  return body;
}

/**
 * Marks the body for removal in the collision
 * loop and in the renderer.
 *
 * @param {Body} body
 */
World.prototype.releaseBody = function(body){
  debug('release body',body.index)
  body.removed = true
  return body;
}

/**
 * Frees and removes the body from the
 * physics.
 *
 * Should only be called outside of `oncollision()`
 * since it will be removed from the bodies array
 * and the collision loop may go bananas.
 *
 * If a body is removed _inside_ the collision
 * loop use `releaseBody()`. It will be destroyed
 * then after the loop.
 *
 * @param {Body} body
 */
World.prototype.destroyBody = function(body){
  debug('destroy body',body.index)
  if( !body.removed )
    this.releaseBody(body)
  this.bodies.del(body.index)
  body.free()
}

World.prototype.copy = function(from){
  debug('copy')

  // must set index first for createBody to create the correct body...
  this.frame = from.frame;
  this.index = from.index;

  if( !(from instanceof World) )
    throw new Error('World instance expected');

  for (var i = 0; i < from.bodies.length; i++) {
    if( !(from.bodies.values[i] instanceof Body) )
      throw new Error('copied body not a Body!')
    // if( from.bodies.values[i].index !== this.bodies.values[i].index ){
    //   console.warn('indexes don\'t match')
    //   debugger;
    // }
  };

  copyBodies(this,from.bodies,this.bodies)
  copyBodies(this,from.pucks,this.pucks)
  copyBodies(this,from.extras,this.extras)
  copyBodies(this,from.obstacles,this.obstacles)
  copyBodies(this,from.forces,this.forces)
  copyBodies(this,from.bullets,this.bullets)
  copyBodies(this,from.paddles,this.paddles)
  copyBodies(this,from.shields,this.shields)

  for (var i = 0; i < this.bodies.length; i++) {
    // also check the from.bodies.values[i] and
    // see if it changed.
    if( !(this.bodies.values[i] instanceof Body) )
      throw new Error('copied body not a Body!')
  };

  // copy the random state
  this.rand.state = from.rand.state;

  // Skipping added/removed because
  // the synced game doesn't have a renderer
  // so it'll just keep them forever so on
  // `replay()` it will add doubles!
  //
  // copy(from.added,this.added)
  // copy(from.removed,this.removed)

  copy(from.activeExtras,this.activeExtras)
  copy(from.level,this.level)
  copy(from.lastHitPucks,this.lastHitPucks)
  copy(from.puckBounces,this.puckBounces)

  this.maxAlive = from.maxAlive;
  this.alive = from.alive;
  this.host = from.host;
  this.paused = from.paused;
  this.over = from.over;
  this.winner = from.winner;
  this.collisions = from.collisions;
  this.runLevels = from.runLevels;
  this.level = copy(from.level,this.level);

  this.players.a.copy(from.players.a)
  this.players.b.copy(from.players.b)
}

World.prototype.reset = function(){
  debug('reset')
  this.frame = 0;
  this.index = 0;

  // reset scores if games was over
  // before the reset.
  var wasOver = this.over;

  this.rand = new Random(1);

  // TODO instead of just emptying
  //      we should use actions.destroyX(this,x)
  //      to properly free the allocated vecs/polys
  this.bodies.empty();
  this.obstacles.empty();
  this.pucks.empty();
  this.forces.empty();
  this.bullets.empty();
  this.paddles.empty();
  this.shields.empty();
  this.extras.empty();
  this.activeExtras.empty();

  this.lastHitPucks = {} // TODO would it be better to loop/delete?
  this.puckBounces = {}

  this.multiplayer = false;
  this.alive = 0;
  this.paused = true;
  this.over = false;
  this.runLevels = false;

  this.winner = null;
  this.collisions = 0;  // used for statistics

  this.players.a.reset(wasOver);
  this.players.b.reset(wasOver);
  return this;
}

// default player object
function Player(name){
  this.name = name
  this.shields = []   // shields down (should be set to [1,1,1] on round start and if first one is hit it will turn into [0,1,1] etc)
  this.score = 0      // rounds won
  this.paddle = -1    // set in Simulator#create, an index to a paddle
}
Player.prototype.copy = function(from){
  this.name = from.name;
  this.score = from.score;
  this.paddle = from.paddle;
  copy(from.shields,this.shields)
}
Player.prototype.reset = function(resetScores){
  this.shields.length = 0;
  if( resetScores )
    this.score = 0;
  this.paddle = -1;
  return this;
}

// extend Stash with a copy method
stash.Stash.prototype.copy = function(from){
  copy(from.values,this.values)
  copy(from.lookup,this.lookup)
  copy(from.reverse,this.reverse)
  this.length = from.length;
}


// copyBodies(this,from.bodies,this.bodies)
function copyBodies(world,from,to){

  // var keysFrom = Object.keys(from.lookup).sort().join(',')
  // var keysTo = Object.keys(to.lookup).sort().join(',')

  // if( keysFrom !== keysTo ){
  //   console.log('the bodies has changed')
  //   console.log('  from:',keysFrom)
  //   console.log('  to:',keysTo)
  // }

  for(var i=0; i<from.length; i++){
    var a = from.values[i]
      , b;

    if( !a ){
      throw new Error('invalid stash!')
    }

    // check existance
    if( !to.has(a.index) ){
      // the body has been removed
      // since sync. re-add it.


      // it might have been added to
      // bodies already, in which case
      // use that one
      if( world.bodies.has(a.index) ){
        b = world.bodies.get(a.index);
        to.set(b.index,b);

      // if not we need to recreate it
      } else {
        // temporary reset world index to make sure
        // it gets the right index
        var tmp = world.index;
        world.index = a.index;

        b = world.createBody(a.shape,0,0,0);
        console.log('recreated body',b.index)

        world.index = tmp;
      }

      // verify it got that index
      if( b.index !== a.index )
        throw new Error('wrong index')

    // it's there!
    } else {
      b = to.get(a.index);

    }


    // TODO how to figure out if `to` contains
    //      a body that `from` has destroyed?
    //      (should it ever happen?)

    if( !to.has(a.index) ){
      throw new Error('body was never created')
    }

    // copy properties
    copy(a,b);
  }

  // slow way of finding the difference and destroy it
  // at this point there should always be more `from` than `to`
  // because `to` is ahead of `from` and may have removed a body
  // that `from` hasn't.
  if( from.length !== to.length ){
    // TODO find the extra ones
    for(var i=0; i<to.length; i++){
      var b = to.values[i];

      // TODO issue here is that the indexes might not
      //      match during a replay...

      if( !from.has(b.index) ){
        console.log('deleting %s from `to` index',b.index)
        to.del(b.index);
      }
    }

  }

  if( from.length !== to.length )
    throw new Error('bodies does not match!')

}
