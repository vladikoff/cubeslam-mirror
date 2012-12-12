var Mousetrap = require('mousetrap')
  , debug = require('debug')('inputs');

function Point(x,y){
  this.x = x;
  this.y = y;
  this.last = null;
  this.moved = false;
}
Point.prototype.set = function(p){ this.x = p.x; this.y = p.y; }

module.exports = Inputs;

function Inputs(){
  this.mouse = new Point();
  this.mouse.last = new Point();
  this.width = window.innerWidth;
  this.height = window.innerHeight;
  this._active = {};
  document.addEventListener('mousemove', onmousemove.bind(this), false);
  window.addEventListener('resize', onresize.bind(this), false)
}

Inputs.prototype = {

  // inputs.bind('space','pause')
  bind: function(keys,id){
    debug('bind',keys, id)
    // special case for mouse:
    if( keys.indexOf('mouse') == 0 ){
      // TODO ex. 'mouse left'/'mouse right'/'mouse move'
    } else {
      Mousetrap.bind(keys,onaction(id,'up').bind(this),'keyup')
      Mousetrap.bind(keys,onaction(id,'down').bind(this),'keydown')
    }
    return this;
  },

  unbind: function(keys, id){
    debug('unbind',keys, id)
    // special case for mouse:
    if( keys.indexOf('mouse') == 0 ){
      // TODO ex. 'mouse left'/'mouse right'/'mouse move'
    } else {
      Mousetrap.unbind(keys,id,'keyup')
      Mousetrap.unbind(keys,id,'keydown')
      this._active[id+':up'] = false
      this._active[id+':down'] = false
      this._active[id+':press'] = false
    }
    return this;
  },

  pressed: function(id){
    return this._active[id+':press'];
  },

  released: function(id){
    return this._active[id+':up'];
  },

  down: function(id){
    return this._active[id+':down'];
  },

  reset: function(){
    this.mouse.moved = false;
    for( var k in this._active ){
      if( ~k.indexOf(':down') )
        continue;
      this._active[k] = false
    }
  }
}

function onmousemove(e){
  if( this.mouse.moved ) return;
  this.mouse.last.set(this.mouse);
  this.mouse.x = e.pageX/this.width;
  this.mouse.y = e.pageY/this.height;
  this.mouse.moved = true;
}

function onaction(id,action){
  return function(){
    this._active[id+':'+action] = true
    if( action == 'up' )
      this._active[id+':down'] = false
    if( action == 'down' )
      this._active[id+':press'] = true
  }
}

function onresize(e){
  this.width = window.innerWidth;
  this.height = window.innerHeight;
}