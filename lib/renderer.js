/**
 * This is a Renderer front which will be a assigned a
 * renderer implementation like 2D, 3D or CSS.
 */

var debug = require('debug')('renderer');

module.exports = Renderer;

function Renderer(){
  this.impl = null;
}

Renderer.prototype = {

  set: function(r){
    this.impl = r;
  },

  triggerEvent: function(id,opts){
    debug('triggerEvent',id,opts)
    if( !this.impl ) return;
    this.impl.triggerEvent(id,opts)
  },
  changeView: function(state, callback){
    debug('changeView',state)
    if( !this.impl ) return;
    this.impl.changeView(state,callback)
  },
  activePlayer: function(id,init,multiplayer){
    debug('activePlayer',id,init,multiplayer)
    if( !this.impl ) return;
    this.impl.activePlayer(id,init,multiplayer)
  },
  reset: function(){
    debug('reset')
    if( !this.impl ) return;
    this.impl.reset()
  },
  render: function(world,alpha){
    if( !this.impl ) return;
    this.impl.render(world,alpha)
  }
}