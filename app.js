(function(){var global = this;
/*!
 * debug
 * Copyright(c) 2012 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Create a debugger with the given `name`.
 *
 * @param {String} name
 * @return {Type}
 * @api public
 */

function debug(name) {
  if (!debug.enabled(name)) return function(){};

  return function(fmt){
    var curr = new Date;
    var ms = curr - (debug[name] || curr);
    debug[name] = curr;

    fmt = name
      + ' '
      + fmt
      + ' +' + debug.humanize(ms);

    // This hackery is required for IE8
    // where `console.log` doesn't have 'apply'
    window.console
      && console.log
      && Function.prototype.apply.call(console.log, console, arguments);
  }
}

/**
 * The currently active debug mode names.
 */

debug.names = [];
debug.skips = [];

/**
 * Enables a debug mode by name. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} name
 * @api public
 */

debug.enable = function(name) {
  localStorage.debug = name;

  var split = (name || '').split(/[\s,]+/)
    , len = split.length;

  for (var i = 0; i < len; i++) {
    name = split[i].replace('*', '.*?');
    if (name[0] === '-') {
      debug.skips.push(new RegExp('^' + name.substr(1) + '$'));
    }
    else {
      debug.names.push(new RegExp('^' + name + '$'));
    }
  }
};

/**
 * Disable debug output.
 *
 * @api public
 */

debug.disable = function(){
  debug.enable('');
};

/**
 * Humanize the given `ms`.
 *
 * @param {Number} m
 * @return {String}
 * @api private
 */

debug.humanize = function(ms) {
  var sec = 1000
    , min = 60 * 1000
    , hour = 60 * min;

  if (ms >= hour) return (ms / hour).toFixed(1) + 'h';
  if (ms >= min) return (ms / min).toFixed(1) + 'm';
  if (ms >= sec) return (ms / sec | 0) + 's';
  return ms + 'ms';
};

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

debug.enabled = function(name) {
  for (var i = 0, len = debug.skips.length; i < len; i++) {
    if (debug.skips[i].test(name)) {
      return false;
    }
  }
  for (var i = 0, len = debug.names.length; i < len; i++) {
    if (debug.names[i].test(name)) {
      return true;
    }
  }
  return false;
};

// persist

if (window.localStorage) debug.enable(localStorage.debug);function require(p, parent){ var path = require.resolve(p) , mod = require.modules[path]; if (!mod) throw new Error('failed to require "' + p + '" from ' + parent); if (!mod.exports) { mod.exports = {}; mod.call(mod.exports, mod, mod.exports, require.relative(path), global); } return mod.exports;}require.modules = {};require.resolve = function(path){ var orig = path , reg = path + '.js' , index = path + '/index.js'; return require.modules[reg] && reg || require.modules[index] && index || orig;};require.register = function(path, fn){ require.modules[path] = fn;};require.relative = function(parent) { return function(p){ if ('debug' == p) return debug; if ('.' != p.charAt(0)) return require(p); var path = parent.split('/') , segs = p.split('/'); path.pop(); for (var i = 0; i < segs.length; i++) { var seg = segs[i]; if ('..' == seg) path.pop(); else if ('.' != seg) path.push(seg); } return require(path.join('/'), parent); };};require.register("app.js", function(module, exports, require, global){
var Game = require('./game')
  , Simulator = require('./simulator');

new Game()
  .pushState(new Simulator(document.getElementById('canv')))
  .run()
});require.register("body.js", function(module, exports, require, global){
var PointMass = require('./point-mass');


module.exports = Body;

/*
   O
  /|\
 / | \
  / \
 |   |
*/

function Body (x, y, bodyHeight) {
  var headLength = bodyHeight / 7.5
    , headWidth = headLength * 3/4;

  var head = new PointMass(x + random(-5,5),y + random(-5,5), 4);
  var shoulder = new PointMass(x + random(-5,5),y + random(-5,5), 26);
  head.attachTo(shoulder, 5/4 * headLength, 1, bodyHeight*2);
  
  var elbowLeft = new PointMass(x + random(-5,5),y + random(-5,5), 2);
  var elbowRight = new PointMass(x + random(-5,5),y + random(-5,5) , 2);
  elbowLeft.attachTo(shoulder, headLength*3/2, 1, bodyHeight*2);
  elbowRight.attachTo(shoulder, headLength*3/2, 1, bodyHeight*2);
  
  var handLeft = new PointMass(x + random(-5,5),y + random(-5,5), 2);
  var handRight = new PointMass(x + random(-5,5),y + random(-5,5), 2);
  handLeft.attachTo(elbowLeft, headLength*2, 1, bodyHeight*2);
  handRight.attachTo(elbowRight, headLength*2, 1, bodyHeight*2);
  
  var pelvis = new PointMass(x + random(-5,5),y + random(-5,5), 15);
  pelvis.attachTo(shoulder,headLength*3.5,0.8,bodyHeight*2);

  // this restraint keeps the head from tilting in extremely uncomfortable positions
  pelvis.attachTo(head, headLength*4.75, 0.02, bodyHeight*2).hidden = true;
  
  var kneeLeft = new PointMass(x + random(-5,5),y + random(-5,5), 10);
  var kneeRight = new PointMass(x + random(-5,5),y + random(-5,5), 10);
  kneeLeft.attachTo(pelvis, headLength*2, 1, bodyHeight*2);
  kneeRight.attachTo(pelvis, headLength*2, 1, bodyHeight*2);
  
  var footLeft = new PointMass(x + random(-5,5),y + random(-5,5), 5);
  var footRight = new PointMass(x + random(-5,5),y + random(-5,5), 5);
  footLeft.attachTo(kneeLeft, headLength*2, 1, bodyHeight*2);
  footRight.attachTo(kneeRight, headLength*2, 1, bodyHeight*2);
  
  // these constraints resist flexing the legs too far up towards the body
  footLeft.attachTo(shoulder, headLength*7.5, 0.001, bodyHeight*2).hidden = true;
  footRight.attachTo(shoulder, headLength*7.5, 0.001, bodyHeight*2).hidden = true;
  
  // TODO
  // headCircle = new Circle(headLength*0.75);
  // headCircle.attachToPointMass(head);
  
  this.head = head;
  this.shoulder = shoulder;
  this.pelvis = pelvis;
  this.elbowLeft = elbowLeft;
  this.elbowRight = elbowRight;
  this.handLeft = handLeft;
  this.handRight = handRight;
  this.kneeLeft = kneeLeft;
  this.kneeRight = kneeRight;
  this.footLeft = footLeft;
  this.footRight = footRight;
}

Body.prototype.setBounds = function(bounds){
  this.head.bounds = bounds;
  this.shoulder.bounds = bounds;
  this.pelvis.bounds = bounds;
  this.elbowLeft.bounds = bounds;
  this.elbowRight.bounds = bounds;
  this.handLeft.bounds = bounds;
  this.handRight.bounds = bounds;
  this.kneeLeft.bounds = bounds;
  this.kneeRight.bounds = bounds;
  this.footLeft.bounds = bounds;
  this.footRight.bounds = bounds;
}

Body.prototype.addToWorld = function(world){
  world.push(this.head);
  world.push(this.shoulder);
  world.push(this.pelvis);
  world.push(this.elbowLeft);
  world.push(this.elbowRight);
  world.push(this.handLeft);
  world.push(this.handRight);
  world.push(this.kneeLeft);
  world.push(this.kneeRight);
  world.push(this.footLeft);
  world.push(this.footRight);

  // TODO
  // physics.addCircle(headCircle);
}

Body.prototype.removeFromWorld = function(world){
  function rem(x){ var i=world.indexOf(x); ~i && world.splice(i,1); }
  rem(this.head);
  rem(this.shoulder);
  rem(this.pelvis);
  rem(this.elbowLeft);
  rem(this.elbowRight);
  rem(this.handLeft);
  rem(this.handRight);
  rem(this.kneeLeft);
  rem(this.kneeRight);
  rem(this.footLeft);
  rem(this.footRight);
}


function random(min,max){
  return min + Math.random()*(max-min);
}
});require.register("game.js", function(module, exports, require, global){
var requestAnimationFrame = require('./request-animation-frame')
  , Inputs = require('./inputs')
  , debug = require('debug')('game');

// Example usage:
// new Game()
//   .pushState(MenuState)
//   .run()

module.exports = Game;


function Game(){
  this.inputs = new Inputs();
  this.states = [];
  this.current = null;
}

Game.prototype.pushState = function(state){
  debug('pushState')
  if( typeof state != 'object' )
    throw new Error('invalid state. must be object.');
  this.states.push(state);
  this.current = state;
  state.game = this;
  state.create && state.create();
  return this;
}

Game.prototype.popState = function(){
  debug('popState')
  var state = this.current;
  state.destroy && state.destroy();
  delete state.game;
  this.current = this.states.pop();
  return this;
}

Game.prototype.isState = function(state){
  return state === this.current;
}

Game.prototype.switchState = function(state){
  debug('switchState')
  this.popState().pushState(state);
}

Game.prototype.run = function(){
  if( !this.current )
    throw new Error('no current state. must pushState() first.');
  debug('run')

  var t = 0.0
    , timestep = 1/60
    , currentTime = 0.0
    , accumulator = 0.0
    , game = this;

  function loop(){
    requestAnimationFrame(loop);
    
    var newTime = Date.now() / 1000 // in seconds
      , deltaTime = newTime - currentTime
      , maxDeltaTime = 0.25;
    currentTime = newTime;

    var state = game.current;
    if( !state ){
      console.error('no more states. done!')
      debug('stop')
      return;
    }
    
    // note: max frame time to avoid spiral of death
    if (deltaTime > maxDeltaTime)
      deltaTime = maxDeltaTime;

    // update 
    accumulator += deltaTime;
    while(accumulator >= timestep) {
      state.game && state.controls && state.controls(game.inputs);
      state.game && state.update && state.update(timestep,t);
      t += timestep;
      accumulator -= timestep;
    }

    // render
    state.game && state.render && state.render(accumulator/timestep);
  }
  loop();
  return this;
}
});require.register("inputs.js", function(module, exports, require, global){

var Point = require('./point')


module.exports = Inputs;


function Inputs(){
  this.mouse = new Point();
  this.mouse.last = new Point();
  this.touches = [];
  this.keyboard = {};
  this.forms = [];

  var inputs = this;

  if( document ){
    // handle browser mouse events
    document.addEventListener('mousedown', function(e){
      e.preventDefault();
      inputs.onmousedown(e);
    }, false);
    document.addEventListener('mousemove', function(e) {
      e.preventDefault();
      inputs.onmousemove(e);
    }, false);
    document.addEventListener('mouseup', function(e){
      e.preventDefault();
      inputs.onmouseup(e);
    }, false);

    // handle browser form elements
    this.form = {};
    for(var f=0; f < document.forms.length; f++){
      var form = document.forms[f];
      for(var e=0; e < form.elements.length; e++){
        var element = form.elements[e];

        console.log(element.nodeName,element.type,element.name)

        // TODO add listeners to elements
        switch(element.nodeName.toLowerCase()){
          case 'button':
            element.addEventListener('mousedown',function(e){
              e.stopImmediatePropagation();
              e.preventDefault();
              inputs.onbuttondown(e,element);
            },false)
            element.addEventListener('mouseup',function(e){
              e.stopImmediatePropagation();
              e.preventDefault();
              inputs.onbuttonup(e,element);
            },false)
            break;
        }
      }
    }
  }
}

Inputs.prototype.pressed = function(key){
  if( /(\w+) (\w+)/.exec(key) ){
    var type = RegExp.$1
      , name = RegExp.$2;
    return this[type][name];
  }
}

Inputs.prototype.onbuttondown = function(e,element){
  this.form[element.name] = true;
}
Inputs.prototype.onbuttonup = function(e,element){
  this.form[element.name] = false;
}
Inputs.prototype.onmousedown = function(e){
  this.mouse.down = true;
  this.mouse.up = false;
}
Inputs.prototype.onmouseup = function(e){
  this.mouse.down = false;
  this.mouse.up = true;
}
Inputs.prototype.onmousemove = function(e){
  this.mouse.last.set(this.mouse);
  this.mouse.set(e.offsetX,e.offsetY);
}

});require.register("link.js", function(module, exports, require, global){
var Point = require('./point');

module.exports = Link;

function Link(pointMassA, pointMassB, restingDistance, stiffness, tearSensitivity ){
  if( !pointMassA )
    throw new Error('invalid point mass a')
  if( !pointMassB )
    throw new Error('invalid point mass b')
  if( typeof restingDistance != 'number' )
    throw new Error('resting difference must be a number');
  if( typeof stiffness != 'number' )
    throw new Error('stiffness must be a number');
  if( typeof tearSensitivity != 'number' )
    throw new Error('tear sensitivity must be a number');

  this.a = pointMassA;
  this.b = pointMassB;
  this.restingDistance = restingDistance;
  this.stiffness = stiffness;
  this.tearSensitivity = tearSensitivity;
}

Link.prototype = {

  solve: function(){
    // calculate the distance between the two PointMasses
    var diff = Point.diff(this.b.current,this.a.current)
      , dist = diff.length
      , ratio = (this.restingDistance - dist) / dist;

    // if the distance is more than curtainTearSensitivity, the cloth tears
    if( dist > this.tearSensitivity )
      this.a.removeLink(this);

    // Inverse the mass quantities
    var imA = 1 / this.a.mass
      , imB = 1 / this.b.mass
      , scA = (imA / (imA + imB)) * this.stiffness
      , scB = this.stiffness - scA;

    // Push/pull based on mass
    // heavier objects will be pushed/pulled less than attached light objects
    this.a.current.add(diff.x*scA*ratio,diff.y*scA*ratio);
    this.b.current.sub(diff.x*scB*ratio,diff.y*scB*ratio);
  }

}
});require.register("physics.js", function(module, exports, require, global){

module.exports = Physics;

function Physics(){
  this.pointMasses = [];
  this.constraintAccuracy = 3;
}

Physics.prototype = {

  reverse: function(){
    // reverse positions of each point mass
    for(var i=0; i < this.pointMasses.length; i++){
      var pointMass = this.pointMasses[i]
        , tempx = pointMass.current.x
        , tempy = pointMass.current.y;
      pointMass.current.set(pointMass.previous);
      pointMass.previous.set(tempx,tempy);
    }
  },
    
  update: function(timeStep){
    // solve constraints
    for(var i=0; i < this.constraintAccuracy; i++){
      for(var j=0; j < this.pointMasses.length; j++)
        this.pointMasses[j].solveConstraints();
      
      // TODO circles?
    }

    // update position
    for(var i=0; i < this.pointMasses.length; i++)
      this.pointMasses[i].update(timeStep);
  }

}
});require.register("point-mass.js", function(module, exports, require, global){
var Point = require('./point')
  , Link = require('./link');

module.exports = PointMass;

function PointMass(x,y,mass){
  this.previous = new Point(x,y);
  this.current = new Point(x,y);
  this.acceleration = new Point();
  this.velocity = new Point();
  this.mass = mass || 1; 
  this.damping = 1; // 0-1
  this.links = []; // TODO linked list?!
  this.bounds = null; // TODO Rect(t,r,b,l)

  this._pinned = null;
  this._next = new Point();
}

PointMass.prototype = {
    
  update: function(timeStep){
    var tsq = timeStep * timeStep;

    // update velocity
    this.velocity.set(
      this.current.x-this.previous.x,
      this.current.y-this.previous.y
    )

    // apply damping
    if( this.damping != 1 )
      this.velocity.mul(this.damping);

    this._next.set(
      this.current.x + this.velocity.x + .5 * this.acceleration.x * tsq,
      this.current.y + this.velocity.y + .5 * this.acceleration.y * tsq
    )

    this.previous.set(this.current);
    this.current.set(this._next);

    this.acceleration.reset();
  },

  solveConstraints: function(){
    // Links
    for(var i=0; i < this.links.length; i++ )
      this.links[i].solve();

    // Boundaries
    if( this.bounds && !this.bounds.within(this.current) ){
      // Find intersection
      var intersections = this.bounds.intersectsWithLine(this.previous,this.current);

      // Make sure it's one, and only one
      if( !intersections )
        return;
      if( intersections.length > 1 )
        console.warn('something went wrong',intersections);

      var intersection = intersections[0];

      // Reflect against surface normal (n)
      // v' = v - 2(v⋅n)n
      var v1 = this.velocity.clone()
        , n = intersection.normal
        , vd = v1.dot(n) * 2
        , v2 = v1.clone().sub(n.mul(vd)).normalize()

      var p2 = v2.clone().mul(-Point.distance(intersection,this.previous))
        , c2 = v2.clone().mul(+Point.distance(intersection,this.current)) 

      this.previous.set(p2).add(intersection)
      this.current.set(c2).add(intersection)

      this.acceleration.reset()
    }

    // Pinned
    if( this._pinned )
      this.current.set(this._pinned);
  },

  attachTo: function(pointMass, restingDist, stiffness, tearSensitivity){
    if( this === pointMass )
      throw new Error('cannot attach to itself');
    if( !(pointMass instanceof PointMass) )
      throw new Error('must attach to PointMass');
    var link = new Link(this, pointMass, restingDist, stiffness, tearSensitivity);
    this.links.push(link);
    return link;
  },

  removeLink: function(link){
    var i = this.links.indexOf(link);
    this.links.splice(i,1);
    return link;
  },

  applyForce: function(x,y){
    var invMass = 1/this.mass;
    this.acceleration.add(x*invMass,y*invMass);
  },

  pinTo: function(x,y){
    if( !this._pinned )
      this._pinned = new Point(x,y)
    else
      this._pinned.set(x,y)
  }

}
});require.register("point.js", function(module, exports, require, global){
module.exports = Point;


function Point(x,y){
  if( !(this instanceof Point) )
    return new Point(x,y);
  if( typeof x == 'object' )
    y = x.y, x = x.x;
  this.x = x || 0;
  this.y = y || 0;
}

Point.prototype = {

  set: function(x,y){
    // pt.set(pt2);
    if( x instanceof Point ){
      this.x = x.x;
      this.y = x.y;

    // pt.set(2)
    } else if( arguments.length == 1 ){
      this.x = x;
      this.y = x;

    // pt.set(2,4)
    } else if( arguments.length == 2 ){
      this.x = x;
      this.y = y;

    } else {
      throw new Error('invalid arguments');
    }
    return this//.validate();
  },

  add: function(x,y){
    // pt.add(pt2);
    if( x instanceof Point ){
      this.x += x.x;
      this.y += x.y;

    // pt.add(2)
    } else if( arguments.length == 1 ){
      this.x += x;
      this.y += x;

    // pt.add(2,4)
    } else if( arguments.length == 2 ){
      this.x += x;
      this.y += y;

    } else {
      throw new Error('invalid arguments');
    }
    return this//.validate();
  },

  sub: function(x,y){
    // pt.sub(pt2);
    if( x instanceof Point ){
      this.x -= x.x;
      this.y -= x.y;

    // pt.sub(2)
    } else if( arguments.length == 1 ){
      this.x -= x;
      this.y -= x;

    // pt.sub(2,4)
    } else if( arguments.length == 2 ){
      this.x -= x;
      this.y -= y;

    } else {
      throw new Error('invalid arguments');
    }
    return this//.validate();
  },

  mul: function(x,y){
    // pt.mul(pt2);
    if( x instanceof Point ){
      this.x *= x.x;
      this.y *= x.y;

    // pt.mul(2)
    } else if( arguments.length == 1 ){
      this.x *= x;
      this.y *= x;

    // pt.mul(2,4)
    } else if( arguments.length == 2 ){
      this.x *= x;
      this.y *= y;

    } else {
      throw new Error('invalid arguments');
    }
    return this//.validate();
  },

  div: function(x,y){
    // pt.div(pt2);
    if( x instanceof Point ){
      this.x /= x.x;
      this.y /= x.y;

    // pt.div(2)
    } else if( arguments.length == 1 ){
      this.x /= x;
      this.y /= x;

    // pt.div(2,4)
    } else if( arguments.length == 2 ){
      this.x /= x;
      this.y /= y;

    } else {
      throw new Error('invalid arguments');
    }
    return this//.validate();
  },

  abs: function(){
    this.x = Math.abs(this.x);
    this.y = Math.abs(this.y);
    return this;
  },

  dot: function(pt){
    return this.x*pt.x+this.y*pt.y;
  },

  get length(){
    return Math.sqrt(this.dot(this));
  },

  reset: function(){
    this.x = 0;
    this.y = 0;
    return this//.validate();
  },

  normalize: function(){
    var len = this.length;
    if( len ){
      this.x /= len;
      this.y /= len;
    }
    return this;
  },

  clone: function(){
    return new Point(this.x,this.y);
  },

  copy: function(pt){
    if( pt ){
      this.x = pt.x || this.x;
      this.y = pt.y || this.y;
    }
    return this//.validate();
  },

  validate: function(){
    if( typeof this.x != 'number' )
      throw new Error('invalid x:'+this.x)
    if( typeof this.y != 'number' )
      throw new Error('invalid y:'+this.y)
    return this;
  },

  toString: function(){
    return '('+this.x+','+this.y+')';
  }

}

// aliases
Point.prototype.multiply = Point.prototype.mul;
Point.prototype.subtract = Point.prototype.sub;
Point.prototype.divide   = Point.prototype.div;

Point.polar = function(angle,length){
  var toRadian = Math.PI/180;
  return new Point(
    Math.sin(angle*toRadian)*length,
    Math.cos(angle*toRadian)*length
  );
}

Point.distance = function(a,b){
  return Point.diff(a,b).length;
}

Point.diff = function(a,b){
  return new Point(b.x-a.x,b.y-a.y);
}
});require.register("rect.js", function(module, exports, require, global){
var Point = require('./point');


module.exports = Rect;

function Rect(t,r,b,l){
  this.t = t;
  this.r = r;
  this.b = b;
  this.l = l;
}

Rect.prototype = {

  within: function(pt){
    return pt.x > this.l && pt.x < this.r
        && pt.y > this.t && pt.y < this.b;
  },

  restrain: function(pt){
    if( pt.y < this.t )
      pt.y = 2 * this.t - pt.y;
    if( pt.y > this.b )
      pt.y = 2 * this.b - pt.y;
    if( pt.x < this.l )
      pt.x = 2 * this.l - pt.x;
    if( pt.x > this.r )
      pt.x = 2 * this.r - pt.x;
  },

  // source: http://www.kevlindev.com/gui/math/intersection/Intersection.js
  intersectsWithLine: function(a1,a2){
    var topLeft = new Point(this.l,this.t)
      , topRight = new Point(this.r,this.t)
      , bottomLeft = new Point(this.l,this.b)
      , bottomRight = new Point(this.r,this.b)
      , pt
      , results = [];

    pt = intersectsLineLine(topLeft,topRight,a1,a2)
    if( pt ) results.push(pt);
    pt = intersectsLineLine(topRight,bottomRight,a1,a2)
    if( pt ) results.push(pt);
    pt = intersectsLineLine(bottomRight,bottomLeft,a1,a2)
    if( pt ) results.push(pt);
    pt = intersectsLineLine(bottomLeft,topLeft,a1,a2)
    if( pt ) results.push(pt);

    return results.length ? results : null;
  }

}


function intersectsLineLine(a1,a2,b1,b2){
  var result;

  var ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
  var ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
  var u_b  = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);

  if ( u_b != 0 ) {
    var ua = ua_t / u_b;
    var ub = ub_t / u_b;

    // intersects!
    if ( 0 <= ua && ua <= 1 && 0 <= ub && ub <= 1 ) {
      var pt = new Point(
        a1.x + ua * (a2.x - a1.x),
        a1.y + ua * (a2.y - a1.y)
      )
      // add normal vector for the crossed line
      var dx = a2.x - a1.x
        , dy = a2.y - a1.y;
      // or dy, -dx (for ccw)
      pt.normal = new Point(-dy,dx).normalize(); 
      return pt;
    } 

    // no intersection!
    return null;
  } else {
    // Coincident (on top of each other)
    if ( ua_t == 0 || ub_t == 0 ) {
      return null; 
    // Parallel
    } else {
      return null; 
    }
  }
}
});require.register("renderer.js", function(module, exports, require, global){

module.exports = Renderer;

function Renderer(canvas){
  this.pointMasses = [];
  this.canvas = canvas;
  this.context = canvas.getContext('2d');
  this.stats = {
    pointMass: 0,
    links: 0
  }
}

Renderer.prototype = {
  drawPointMass: function(pointMass){
    if( pointMass.links.length ){
      for(var i=0, l=pointMass.links.length; i < l; i++)
        this.drawLink(pointMass.links[i]);
    } else {
      this.context.rect(pointMass.current.x-1,pointMass.current.y-1,2,2)
    }
    this.stats.pointMass++;
  },
  drawLink: function(link){
    if( !link.hidden ){
      this.context.moveTo(link.a.current.x,link.a.current.y)
      this.context.lineTo(link.b.current.x,link.b.current.y)
      this.stats.links++;
    }
  },
  clear: function(){
    this.canvas.width = this.canvas.width;
  },
  render: function(){
    this.stats.pointMass = 0
    this.stats.links = 0
    this.context.strokeStyle = '#000';
    for(var i=0, l=this.pointMasses.length; i < l; i++)
      this.drawPointMass(this.pointMasses[i]);
    this.context.stroke();
  }
}

});require.register("request-animation-frame.js", function(module, exports, require, global){

var requestAnimationFrame = function(fn){ setTimeout(fn, 1000 / 60) };

module.exports = typeof window != 'undefined'
  ? window.requestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.oRequestAnimationFrame
    || window.msRequestAnimationFrame
    || requestAnimationFrame
  : requestAnimationFrame;
});require.register("simulator.js", function(module, exports, require, global){
var Physics = require('./physics')
  , Renderer = require('./renderer')
  , PointMass = require('./point-mass')
  , Point = require('./point')
  , Rect = require('./rect')
  , Body = require('./body');

module.exports = Simulator;

function Simulator(canvas){
  this.width = canvas.width;
  this.height = canvas.height;
  this.bounds = new Rect(1,this.width-1,this.height-1,1);
  this.physics = new Physics();
  this.renderer = new Renderer(canvas);
}

Simulator.prototype = {

  createCurtain: function(width,height){
    var restingDistances = 6;
    var stiffnesses = 1;
    var curtainTearSensitivity = 50;

    var startY = 25;
    var midWidth = (this.width/2 - (width*restingDistances)/2);
    
    for(var y=0; y <= height; y++){
      for(var x=0; x <= width; x++){
        var pointMass = new PointMass(midWidth + x * restingDistances, y * restingDistances + startY);

        if( x != 0 )
          pointMass.attachTo(this.pointMasses[this.pointMasses.length-1], restingDistances, stiffnesses, curtainTearSensitivity);

        if( y != 0 )
          pointMass.attachTo(this.pointMasses[(y-1) * (width+1) + x], restingDistances, stiffnesses, curtainTearSensitivity);

        if( y == 0 )
          pointMass.pinTo(pointMass.current.x,pointMass.current.y)

        pointMass.bounds = this.bounds;
        this.pointMasses.push(pointMass);
      }
    }
  },

  createBodies: function(num){
    var bodyHeight = 40;

    for(var i=0; i < num; i++){
      var bodyX = Math.random()*this.width
        , bodyY = Math.random()*this.height
        , body = new Body(bodyX, bodyY, bodyHeight);

      body.setBounds(this.bounds);
      body.addToWorld(this.pointMasses);
    }
  },

  createPuck: function(){
    var puck = new PointMass(this.width/2,this.height/2);
    puck.mass = 100;
    puck.bounds = this.bounds;
    this.puck = puck
    puck.applyForce(-10000*puck.mass,10000*puck.mass)
    this.pointMasses.push(puck);
  },

  create: function(){
    // keep a list of pointMasses
    this.pointMasses = 
      this.physics.pointMasses = 
      this.renderer.pointMasses = [];

    this.form = document.forms[0];

    this.form.frame.value = 0;

    // this.createCurtain(60,40);
    // this.createBodies(25);
    this.createPuck();
  },

  destroy: function(){
    delete this.pointMasses
    delete this.physics.pointMasses 
    delete this.renderer.pointMasses
  },

  controls: function(inputs){
    if( this.form.paused.checked ) return;

    this.form.frame.value = this.reversed ? +this.form.frame.value-1 : +this.form.frame.value+1;
    this.form.speed.value = this.puck.velocity.length;

    if( this.form.reverse.checked != this.reversed )
      this.physics.reverse();

    this.reversed = this.form.reverse.checked;
    // var gravity = this.form.gravity.checked
    //   , wind = this.form.wind.value;

    for(var i=0; i<this.pointMasses.length; i++){
      var pointMass = this.pointMasses[i];

      // Add gravity to all pointmasses
      // if( gravity )
      //   pointMass.applyForce(0,980);

      // Add random left-to-right wind
      // pointMass.applyForce(Math.random()*wind,0);

      // TODO Add other forces to all pointmasses?

      if( inputs.mouse.down ){
        // every PointMass within this many pixels will be influenced by the cursor
        // var mouseInfluenceSize = 20*20; // squared 
        // var mouseInfluenceScalar = 2;
        // var distSquared = distPointToSegmentSquared(inputs.mouse.last,inputs.mouse,pointMass.current);
        // if( distSquared < mouseInfluenceSize ){
        //   // To change the velocity of our PointMass, we subtract that change from the lastPosition.
        //   // When the physics gets integrated (see updatePhysics()), the change is calculated
        //   // Here, the velocity is set equal to the cursor's velocity
        //   pointMass.previous.set(
        //     pointMass.current.x - (inputs.mouse.x-inputs.mouse.last.x) * mouseInfluenceScalar,
        //     pointMass.current.y - (inputs.mouse.y-inputs.mouse.last.y) * mouseInfluenceScalar
        //   )
        // }

        // gravitate the PointMass towards the mouse
        var force = inputs.mouse.clone().sub(pointMass.current);
        if( force.length < 200 ){
          force.mul(1000)
          pointMass.applyForce(force.x,force.y)
        }
      }
    }
  },
  
  update: function(dt,t){
    if( this.form.paused.checked ) return;
    this.physics.update(dt);
  },

  render: function(){
    this.renderer.clear()
    this.renderer.render()
  }

}


// Using http://www.codeguru.com/forum/showpost.php?p=1913101&postcount=16
// We use this to have consistent interaction
// so if the cursor is moving fast, it won't interact only in spots where the applet registers it at
function distPointToSegmentSquared(a, b, c){
  // line1 = a
  // line2 = b
  // point = c
  var v = Point.diff(c,a)
    , u = Point.diff(b,a)
    , len = u.x*u.x + u.y*u.y
    , det = (-v.x * u.x) + (-v.y * u.y);

  if( det < 0 || det > len ){
    u.set(b.x-c.x,b.y-c.y);
    return Math.min(v.x*v.x + v.y*v.y,u.x*u.x + u.y*u.y)
  }

  det = u.x*v.y - u.y*v.x;
  return (det*det) / len;
}


});app = require('app');
})();
