var debug = require('debug')('renderer:css:puck')
  , pool = require('../support/pool')
  , $ = require('jquery');

module.exports = Puck;

function Puck(){
}

Puck.prototype = {
  create: function(el, body){
    this.body = body;
    this.element = el.addClass('puck puck-16')[0];
    this.sprites = 31;
    var transform = 'rotateX(-90deg) translate3d(361px,-50%,505px) scale(1.5)'
      , style = this.element.style;
    style.webkitTransform = transform;
    style.msTransform = style.MozTransform = style.OTransform = transform;
    return this;
  },
  update: function(renderer, alpha){
    renderer.updatePosition(this, alpha)
    
    var transform = 'rotateX(-90deg) translate3d('+(this.x-23)+'px,-50%,'+(this.y+23)+'px) scale(1.5)'
      , puckClass = ('puck puck-' + (this.sprite < 10 ? '0'+this.sprite : this.sprite))
      , style = this.element.style;

    style.webkitTransform = transform;
    style.msTransform = style.MozTransform = style.OTransform = transform;

    if( this.body.data.ghostball )
      puckClass += this.body.data.ghostball == 1 ? ' ghostball' : ''
    this.element.setAttribute('class', puckClass);
  },
  reset: function(){

  },
  remove: function(){
    this.element.setAttribute('class', 'empty');
    this.element.style = '';
    Puck.free(this);
  }
}

pool(Puck, 2)