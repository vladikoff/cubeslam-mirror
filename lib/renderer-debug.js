
var Renderer2D = require('./renderer-2d')
  , Renderer3D = require('./renderer-3d');


module.exports = Renderer;

function Renderer(canvas){
  this.canvas = canvas;

  var canv2d = document.getElementById('canv-2d');
  var canv3d = document.getElementById('canv-3d');
  this.r2d = new Renderer2D(canv2d);
  this.r3d = new Renderer3D(canv3d);

  this.a2d = false;
  this.a3d = true;
}

Renderer.prototype = {
  triggerEvent: function(id,opts){
    // add "2d"-, "3d"- & "both"-events
    // which toggles the rendering of the
    // renderers
    switch(id){
      case '2d':
        this.a2d = true;
        this.a3d = false;
        $(this.r2d.canvas).show()
        $(this.r3d.canvas).hide()
        break;
      case '3d':
        this.a2d = false;
        this.a3d = true;
        $(this.r2d.canvas).hide()
        $(this.r3d.canvas).show()
        break;
      case '2d+3d':
        this.a2d = true;
        this.a3d = true;
        $(this.r2d.canvas).show()
        $(this.r3d.canvas).show()
        break;
      default:
        this.r2d.triggerEvent(id,opts)
        this.r3d.triggerEvent(id,opts)
    }
  },
  swapToVideoTexture: function(t){
    this.r2d.swapToVideoTexture(t)
    this.r3d.swapToVideoTexture(t)
  },
  changeView: function(state, callback){
    this.r2d.changeView(state)
    this.r3d.changeView(state,callback)
  },
  activePlayer: function(id){
    this.r2d.activePlayer(id)
    this.r3d.activePlayer(id)
  },
  reset: function(){
    this.r2d.reset()
    this.r3d.reset()
  },
  render: function(world,alpha){
    this.a2d && this.r2d.render(world,alpha)
    this.a3d && this.r3d.render(world,alpha)
  }
}