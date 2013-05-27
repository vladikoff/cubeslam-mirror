
var debug = require('visionmedia-debug')
debug.enable('collisions:*')
var src = typeof process == 'undefined' ? 'slam' : '..';
var World = require(src+'/lib/world')
var Tick = require(src+'/lib/support/tick')
var Renderer2D = require(src+'/lib/renderer-2d')
var physics = require(src+'/lib/sim/physics')
var actions = require(src+'/lib/actions')
var puppeteer = require(src+'/lib/puppeteer')
var timestep = 1000/60;
var renderer = new Renderer2D(document.getElementById('c'))

var world = new World('test')
world.tick = new Tick();

puppeteer.namespace('single')
puppeteer.goto(world,0)

world.players.a.paddle = actions.createPaddle(world,world.players.a);
world.players.b.paddle = actions.createPaddle(world,world.players.b);
actions.createShields(world,world.players.a)
actions.createShields(world,world.players.b)
actions.createPuckCenter(world)

world.setState(World.PLAYING)
world.me = world.players.a;
world.opponent = world.players.b;

var puck = world.pucks.values[0];
var paddle = world.paddles.values[0];

// move the puck into colliding position
puck.current[1] = paddle.current[1] - 70
puck.previous[1] = puck.current[1] - 10
puck.previous[0] = puck.current[0] - 10
paddle.previous[0] = paddle.current[0] + 20

for(var i=0; i<500; i++){
  puppeteer.update(world)
  physics.update(world,timestep)
}

console.log(world)
renderer.render(world,0)