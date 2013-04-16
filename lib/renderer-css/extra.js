var debug = require('debug')('renderer:css:extra')
  , pool = require('../support/pool')
  , $ = require('jquery');

module.exports = Extra;

function Extra(){
}

Extra.prototype = {
  create: function(piece, body){
    this.body = body;
    this.piece = piece;
    this.element = piece.element.attr('class', 'extra ' + body.data.id)[0];
    this.sprites = 1;
    this.rendered = false;
    return this;
  },
  update: function(renderer, alpha){
    if(this.rendered)
      return;
    this.rendered = true;
    renderer.updatePosition(this, alpha)
    var transform  = renderer.matrix + 'rotateX(-90deg) translate3d('+(this.x-31)+'px,-50%,'+this.y+31+'px)'
      , style = this.element.style;

    style.webkitTransform = transform;
    style.msTransform = style.MozTransform = style.OTransform = transform;
  },
  remove: function(){
    this.element.setAttribute('class', 'empty');
    this.element.removeAttribute('style');
    this.piece.remove();
    Extra.free(this);
  }
}
pool(Extra, 4)