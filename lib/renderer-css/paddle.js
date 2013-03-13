var debug = require('debug')('renderer:css:padde')
  , $ = require('jquery');

module.exports = Paddle;

var elem = $('<div class="paddle player"><div class="gfx"></div></div>');

function Paddle(parent, player){
  this.sprites = 31;
  this.width = 189;
  this.player = player;
  this.element = elem.clone().attr('id', player).appendTo($(parent).find('.arena'))[0];

  this.gfx = this.element.children[0];
  this.centerAlpha = 10 + Math.random() * 15;
  this.sprite = 1;
}

Paddle.prototype = {
  update: function(renderer, alpha, body, center){
    if(body) {
      this.body = body;
      renderer.updatePosition(this, alpha)
      this.scaleX = body.data.resized || 1
    }else {
      this.scaleX = 1;
      var w = this.width*renderer.arenaScaleW
      this.sprite = parseInt((this.x-w)/(renderer.width-w*2) * (this.sprites-1))+1
    }
    var transform = 'rotateX(-90deg) translate3d('+(this.x-78)+'px,-50%,'+this.y+'px) scale(1.5)'
      , style = this.element.style;

    style.webkitTransform = transform;
    style.msTransform = style.MozTransform = style.OTransform = transform;

    this.element.setAttribute('class', (this.player + '-00' + (this.sprite < 10 ? '0'+this.sprite : this.sprite)));
    this.gfx.style.webkitTransform = 'scaleX('+this.scaleX+')';
  },
  updateToCenter: function(renderer){
    this.x += ((renderer.width/2)-this.x)/this.centerAlpha
    this.update(renderer, null, null)
  },
  remove: function(){
  }
}