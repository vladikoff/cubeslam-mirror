var debug = require('debug')('renderer:css:extra')
  , pool = require('../support/pool')
  , $ = require('jquery');

module.exports = Extra;

function Extra(){
}

Extra.prototype = {
  create: function(el, body){
    this.body = body;
    this.type = body.data.id.replace(' ', '-');
    this.element = el.addClass('extra ' + this.type)[0]
    this.sprites = 1;
    return this;
  },
  update: function(renderer, alpha){
    renderer.updatePosition(this, alpha)
    var transform  = 'rotateX(-90deg) translate3d('+(this.x-31)+'px,-50%,'+this.y+31+'px) scale(1.4)'
      , style = this.element.style;

    style.webkitTransform = transform;
    style.msTransform = style.MozTransform = style.OTransform = transform;
  },
  remove: function(){
    this.element.setAttribute('class', 'empty');
    this.element.style = '';
    Extra.free(this);
  }
}
pool(Extra, 4)