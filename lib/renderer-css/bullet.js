var debug = require('debug')('renderer:css:bullet')
  , pool = require('../support/pool')
  , $ = require('jquery');

module.exports = Bullet;

function Bullet(){
}

Bullet.prototype = {
  create: function(el, body, renderer){
    this.body = body;
    this.element = el.attr('class', 'bullet')[0];
    return this;
  },
  update: function(renderer, alpha){
    renderer.updatePosition(this, alpha)
    var transform = renderer.matrix + 'translate3d('+(this.x-13)+'px,'+(this.y+15)+'px,0px)'
      , style = this.element.style;
    style.transform = style.webkitTransform = style.msTransform = style.MozTransform = style.OTransform = transform;
  },
  reset: function(){

  },
  remove: function(){
    this.element.setAttribute('class', 'empty');
    this.element.removeAttribute('style');
    Bullet.free(this);
  }
}

pool(Bullet, 2)