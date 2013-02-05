
var debug = require('debug')('renderer:debug')
  , Renderer2D = require('./renderer-2d')
  , Renderer3D = require('./renderer-3d')
  , RendererCSS = require('./renderer-css')
  , $ = require('jquery');

module.exports = Renderer;

function Renderer(canvas,skip3d){
  this.r2d = new Renderer2D(document.getElementById('canv-2d'));
  this.a2d = canvas === this.r2d.canvas;

  if(!skip3d){
    this.r3d = new Renderer3D(document.getElementById('canv-3d'));
    this.a3d = canvas === this.r3d.canvas;
  } else {
    this.r3d = this.r2d;
    this.a3d = false;
  }

  this.rCss = new RendererCSS(document.getElementById('canv-css'));
  this.aCss = canvas === this.rCss.element;

  debug('create css: %s 2d: %s 3d: %s',this.aCss,this.a2d,this.a3d)
}

Renderer.prototype = {
  triggerEvent: function(id,opts){
    debug('triggerEvent',id)
    // add "2d"-, "3d"- & "both"-events
    // which toggles the rendering of the
    // renderers

    switch(id){
      case 'css':
        this.a2d = false;
        this.a3d = false;
        this.aCss = true;
        $(this.r2d.canvas).hide()
        $(this.r3d.canvas).hide()
        $(this.rCss.element).show()
        break;
      case '2d':
        this.a2d = true;
        this.a3d = false;
        this.aCss = false;
        $(this.r2d.canvas).show()
        $(this.r3d.canvas).hide()
        $(this.rCss.element).hide()
        break;
      case '3d':
        this.a2d = false;
        this.a3d = true;
        this.aCss = false;
        $(this.r2d.canvas).hide()
        $(this.r3d.canvas).show()
        $(this.rCss.element).hide()
        break;
      case '2d+3d':
        this.a2d = true;
        this.a3d = true;
        this.aCss = false;
        $(this.r2d.canvas).show()
        $(this.r3d.canvas).show()
        $(this.rCss.element).hide()
        break;
      case '2d+css':
        this.a2d = true;
        this.a3d = false;
        this.aCss = true;
        $(this.r2d.canvas).show()
        $(this.r3d.canvas).hide()
        $(this.rCss.element).show()
        break;
      default:
        this.r2d.triggerEvent(id,opts)
        this.r3d.triggerEvent(id,opts)
        this.rCss.triggerEvent(id,opts)
    }
  },
  getWorldCoordinate: function(x,y){
    throw new Error('do not use?')
  },
  changeView: function(state, callback){
    debug('changeView',state)
    this.r2d.changeView(state)
    this.r3d.changeView(state,callback)
    this.rCss.changeView(state,callback)
  },
  activePlayer: function(world,id){
    debug('activePlayer',id)
    this.r2d.activePlayer(world,id)
    this.r3d.activePlayer(world,id)
    this.rCss.activePlayer(world,id) // should not be in use though...
  },
  reset: function(){
    debug('reset')
    this.r2d.reset()
    this.r3d.reset()
    this.rCss.reset()
  },
  render: function(world,alpha){
    this.a2d && this.r2d.render(world,alpha)
    this.a3d && this.r3d.render(world,alpha)
    this.aCss && this.rCss.render(world,alpha)
  }
}