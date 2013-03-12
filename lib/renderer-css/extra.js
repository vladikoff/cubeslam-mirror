var debug = require('debug')('renderer:css:extra')
  , $ = require('jquery');

module.exports = Extra;

function Extra(el, body, renderer){
  this.body = body;
  this.renderer = renderer;
  this.type = body.data.id.replace(' ', '-');
  this.element = el.addClass('extra ' + this.type)[0]
}

Extra.prototype = {
  update: function(alpha){
    var xy = this.renderer.getPosition(this.body, alpha)
      , x = xy[0], y = xy[1]
    this.element.style.webkitTransform = 'rotateX(-90deg) translateX('+(x-31)+'px) translateY(-50%) translateZ('+y+31+'px) scale(1.4)';
  },
  remove: function(){
    this.element.setAttribute('class', 'empty');
    this.element.style = '';
  }
}