var debug = require('debug')('renderer:css:puck')
  , $ = require('jquery');

module.exports = Puck;

function Puck(el, body, renderer){
  this.body = body;
  this.renderer = renderer;
  this.element = el.addClass('puck puck-16')[0]
}

Puck.prototype = {
  update: function(alpha){
    var xy = this.renderer.getPosition(this.body, alpha)
      , x = xy[0], y = xy[1]
      , bg = parseInt(x / this.renderer.width * 30) + 1
      , transform = 'rotateX(-90deg) translateX('+(x-23)+'px) translateY(-50%) translateZ('+(y+23)+'px) scale(1.5)'
      , puckClass = ('puck puck-' + (bg < 10 ? '0'+bg : bg))

      this.element.style.webkitTransform = transform;
      if( this.body.data.ghostball )
        puckClass += this.body.data.ghostball == 1 ? ' ghostball' : ''
      this.element.setAttribute('class', puckClass);
  },
  reset: function(){

  },
  remove: function(){
    this.element.setAttribute('class', 'empty');
    this.element.style = '';
  }
}