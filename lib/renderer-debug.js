
var Renderer2D = require('./renderer-2d')
  , Renderer3D = require('./renderer-3d');


module.exports = Renderer;

function Renderer(canvas,bounds){
  canvas.parentNode.className += ' renderer-debug';

  this.canvas = canvas;

  var canv2d = document.getElementById('canv-2d');
  var canv3d = document.getElementById('canv-3d');
  this.r2d = new Renderer2D(canv2d,bounds);
  this.r3d = new Renderer3D(canv3d,bounds);
}

Renderer.prototype = {
  triggerEvent: function(id,opts){
    this.r2d.triggerEvent(id,opts)
    this.r3d.triggerEvent(id,opts)
  },
  changeView : function() { },
  activePlayer: function(id){
    this.r2d.activePlayer(id)
    this.r3d.activePlayer(id)
  },
  reset: function(){
    this.r2d.reset()
    this.r3d.reset()
  },
  render: function(world,alpha){
    this.r2d.render(world,alpha)
    this.r3d.render(world,alpha)
  }
}