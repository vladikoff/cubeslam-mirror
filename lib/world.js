var debug = require('debug')('world')
  , stash = require('stash')
  , copy = require('copy')
  , Body = require('./sim/body')
  , BodyFlags = require('./sim/body-flags')
  , Random = require('./support/rand')
  , hashCode = require('./support/hash-code')
  , exclude = require('./support/exclude')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

module.exports = World;

// states
World.INIT = 'init';         // no level, no controls, no physics, no network
World.PREVIEW = 'preview';   // level inactive, controls, physics, no network
World.STARTING = 'starting'; // level inactive, no controls, no physics, no network
World.PLAYING = 'playing';   // level active, controls, physics, network
World.PAUSED = 'paused';     // level inactive, no controls, no physics, no network
World.NEXT_ROUND = 'next round'; // level inactive, no controls, no physics, no network
World.NEXT_LEVEL = 'next level'; // level inactive, no controls, no physics, no network, score reset
World.GAME_OVER = 'game over';   // level inactive, no controls, no physics, no network, score reset

// temporary properties to be
// excluded in hash code and diff
World.EXCLUDED = ['me','opponent','name','hashCode'];

function World(name,tick){
  debug('%s create',name)
  this.frame = 0;
  this.index = 0;
  this.name = name;
  this.tick = tick;

  // keep a seeded random for the world!
  // (don't use World#rand, use World#random() instead)
  this.rand = new Random(seed());

  this.bodies = stash();   // all bodies will be collided in physics
  this.pucks = stash();
  this.extras = stash();
  this.forces = stash();
  this.bullets = stash();
  this.paddles = stash();
  this.shields = stash();
  this.obstacles = stash();

  this.lastHitPucks = {}; // used to look up which paddle a puck hit last
  this.puckBounces = {};  // used to look up how many bounces a puck has
  this.timeouts = {};
  this.state = World.INIT;

  this.level = null;        // states/game.js setupLevels()
  this.me = null;           // states/game.js createGame()
  this.opponent = null;     // states/game.js createGame()
  this.multiplayer = false; // states/game.js Setup.enter()

  this.players = {
    a: new Player('HAL (A)'),
    b: new Player('EVE (B)')
  }
}

World.prototype.code = function(){
  debug('hash code',World.EXCLUDED)
  var hash;
  exclude(this,World.EXCLUDED,function(world){
    hash = hashCode(world)
  })
  return hash;
}

World.prototype.setState = function(state){
  debug('%s set state',this.name,state)
  switch(state){
    case World.INIT:
    case World.PREVIEW:
    case World.STARTING:
    case World.PLAYING:
    case World.PAUSED:
    case World.NEXT_ROUND:
    case World.NEXT_LEVEL:
    case World.GAME_OVER:
      this.state = state;
      break;
    default:
      throw new Error('invalid world state: '+state)
  }
}

World.prototype.random = function(){
  return this.rand.random()
}

World.prototype.createBody = function(shape,x,y,flags){
  debug('%s create body',this.name,this.index);
  var body = Body.alloc();
  body.index = this.index++;
  body.shape = shape;
  body.current[0] = body.previous[0] = x;
  body.current[1] = body.previous[1] = y;
  BodyFlags.set(body,flags);
  this.bodies.set(body.index,body);
  move(body.shape,body.current);
  body.aabb = poly.aabb(shape,body.aabb);
  body.radius = poly.radius(shape)
  return body;
}

/**
 * Marks the body for removal in the collision
 * loop and in the renderer.
 *
 * @param {Body} body
 */
World.prototype.releaseBody = function(body){
  debug('%s release body',this.name,body.index)
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
  debug('%s destroy body',this.name,body.index)
  if( !body.removed ){
    this.releaseBody(body)
  }
  this.bodies.del(body.index)
  Body.free(body)
}

World.prototype.copy = function(from){
  debug('%s copy',this.name,from.name)

  if( !(from instanceof World) ){
    throw new Error('World instance expected');
  }

  // must set index first for createBody to create the correct body...
  this.frame = from.frame;
  this.index = from.index;

  // copy (and remove) timeouts
  copy(from.tick,this.tick,true);

  copyBodies(this,from.bodies,this.bodies)
  copyBodies(this,from.pucks,this.pucks)
  copyBodies(this,from.extras,this.extras)
  copyBodies(this,from.obstacles,this.obstacles)
  copyBodies(this,from.bullets,this.bullets)
  copyBodies(this,from.paddles,this.paddles)
  copyBodies(this,from.shields,this.shields)

  this.forces.copy(from.forces)

  // copy the random state
  this.rand.state = from.rand.state;

  this.lastHitPucks = copy(from.lastHitPucks,this.lastHitPucks,true)
  this.puckBounces = copy(from.puckBounces,this.puckBounces,true)
  this.timeouts = copy(from.timeouts,this.timeouts,true)

  this.level = copy(from.level,this.level,true);
  this.state = from.state;
  this.multiplayer = from.multiplayer;

  this.players.a.copy(from.players.a)
  this.players.b.copy(from.players.b)
}

World.prototype.reset = function(){
  debug('%s reset',this.name)
  this.frame = 0;
  this.index = 0;

  this.tick.reset();

  this.rand = new Random(seed(this.level && this.level.index));

  for(var i=this.bodies.length-1; i >= 0; i--){
    this.destroyBody(this.bodies.values[i]);
  }

  this.obstacles.empty();
  this.pucks.empty();
  this.forces.empty();
  this.bullets.empty();
  this.paddles.empty();
  this.shields.empty();
  this.extras.empty();

  // TODO would it be better to loop/delete?
  this.lastHitPucks = {}
  this.puckBounces = {}
  this.timeouts = {};

  var resetScores = this.state === World.GAME_OVER
                 || this.state === World.NEXT_LEVEL;

  this.players.a.reset(resetScores);
  this.players.b.reset(resetScores);

  return this;
}

// default player object
function Player(name){
  this.name = name
  this.shields = []   // shields down (should be set to [1,1,1] on round start and if first one is hit it will turn into [0,1,1] etc)
  this.score = 0      // rounds won
  this.paddle = -1    // set in Simulator#create, an index to a paddle
  this.wins = 0
  this.hit = -1;      // was this player hit?
}
Player.prototype.copy = function(from){
  this.name = from.name;
  this.score = from.score;
  this.paddle = from.paddle;
  this.wins = from.wins;
  this.hit = from.hit;
  copy(from.shields,this.shields)
}
Player.prototype.reset = function(resetScores, resetWins){
  this.shields.length = 0;
  if( resetScores ){
      this.score = 0;
  }
  if( resetWins ){
    this.wins = 0;
  }
  this.hit = -1;
  this.paddle = -1;
  return this;
}

// extend Stash with a copy method
stash.Stash.prototype.copy = function(from){
  copy(from.values,this.values,true)
  copy(from.lookup,this.lookup,true)
  copy(from.reverse,this.reverse,true)
  this.length = from.length;
}

// extend Stash with a custom hashCode method
stash.Stash.prototype.hashCode = function(){
  // create an object from the values
  var obj = {}; // TODO reuse object?
  for(var k in this.lookup){
    obj[k] = this.values[this.lookup[k]];
  }
  return hashCode(obj)
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
        // make a clone of a (properties will be copied below)
        b = Body.alloc()
        b.index = a.index
        to.set(b.index,b);
      }

      // verify it got that index
      if( b.index !== a.index ){
        throw new Error('wrong index')
      }

    // it's there!
    } else {
      b = to.get(a.index);

    }

    if( !to.has(a.index) ){
      throw new Error('body was never created')
    }

    var pa = a.data.id;
    var pb = b.data.id;

    // copy properties
    copy(a,b,true);


    if( a.data.id !== b.data.id ){
      console.error('data.id did not get copied before: %s,%s after: %s,%s',pa,pb,a.data.id,b.data.id)
    }
  }

  // slow way of finding the difference and destroy it
  // at this point there should always be more `from` than `to`
  // because `to` is ahead of `from` and may have removed a body
  // that `from` hasn't.
  if( from.length !== to.length ){
    var del = [];
    for(var i=0; i<to.length; i++){
      var b = to.values[i];
      if( !from.has(b.index) && !~del.indexOf(b.index) ){
        del.push(b.index);
      }
    }
    // actually delete outside of loop
    while(del.length){
        // console.log('deleting %s from `to` index',b.index)
      to.del(del.pop());
    }
  }

  if( from.length !== to.length ){
    throw new Error('bodies does not match!')
  }
}

function move(shape,to){
  var c = poly.centroid(shape)
  var d = vec.sub(to,c)
  poly.translate(shape, d[0] ,d[1]);
  vec.free(c)
  vec.free(d)
}

// [t,r,b,l]
function center(aabb){
  return vec.make(aabb[3]+(aabb[1]-aabb[3])/2,aabb[0]+(aabb[2]-aabb[0])/2)
}


// generate seed from pathname
function seed(extra){
  return location.pathname.split('')
    .map(function(c){return c.charCodeAt(0)})
    .reduce(function(s,c){return s+c},extra||0)*location.pathname.length;
}
