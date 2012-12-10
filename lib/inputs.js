var Mousetrap = require('mousetrap')
  , debug = require('debug')('inputs');

function Point(x,y){
  this.x = x;
  this.y = y;
  this.last = null;
  this.moved = false;
}
Point.prototype.set = function(p){ this.x = p.x; this.y = p.y; }
Point.prototype.eq = function(p){ return this.x === p.x && this.y === p.y; }

module.exports = Inputs;

function Inputs(){
  this.mouse = new Point();
  this.mouse.last = new Point();

  this.width = window.innerWidth
  this.height = window.innerHeight

  this._active = {};

  // mouse move it important...
  document.addEventListener('mousemove', onmousemove.bind(this), false);
  window.addEventListener('resize', onresize.bind(this), false);
}

Inputs.prototype = {

  // inputs.bind('space','pause')
  // inputs.bind('space','pause','keydown') - 'keypress', 'keydown', or 'keyup'
  bind: function(keys,id,action){
    debug('bind',keys, id, action)
    // special case for mouse:
    if( keys.indexOf('mouse') == 0 ){
      // TODO ex. 'mouse left'/'mouse right'/'mouse move'
    } else {
      Mousetrap.bind(keys,onaction(id+':'+(action||'keypress')).bind(this),action)
    }
    return this;
  },

  unbind: function(keys, action){
    debug('unbind',keys, action)
    // special case for mouse:
    if( keys.indexOf('mouse') == 0 ){
      // TODO ex. 'mouse left'/'mouse right'/'mouse move'
    } else {
      Mousetrap.unbind(keys,action)
    }
    return this;
  },

  pressed: function(action){
    return this._active[action+':keypress'];
  },

  released: function(action){
    return this._active[action+':keyup'];
  },

  down: function(action){
    return this._active[action+':keydown'];
  },

  reset: function(){
    this.mouse.moved = false;
    for( var k in this._active )
      this._active[k] = null
  }
}

function onmousemove(e){
  if( this.mouse.moved ) return;
  this.mouse.last.set(this.mouse);

  // scale mouse position to a 0-1 position (to match "motion")
  this.mouse.x = e.pageX / this.width
  this.mouse.y = e.pageY / this.height
  this.mouse.moved = true;
}

function onresize(e){
  this.width = window.innerWidth
  this.height = window.innerHeight
}

function onaction(id){
  return function(){ this._active[id] = true }
}
