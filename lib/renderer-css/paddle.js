var debug = require('debug')('renderer:css')
  , $ = require('jquery');

module.exports = Paddle;

var elem = $('<div class="paddle player"><div class="gfx"></div></div>');

function Paddle(parent, player, renderer){
  this.player = player;
  this.renderer = renderer;
  this.element = elem.clone().attr('id', player).appendTo($(parent).find('.arena'))[0];
  this.gfx = this.element.children[0];

  this.pw = 189*renderer.arenaScaleW;
}

Paddle.prototype = {
  update: function(body, alpha, center){
    var x, y, bg;
    if(center) {
      x = this.x;
      y = this.y;
    } else {
      var xy = this.renderer.getPosition(body, alpha)
        , scaleX = body.data.resized || 1
      x = xy[0]; y = xy[1];
    }

    bg = parseInt((x-this.pw)/(this.renderer.width-this.pw*2) * 30)+1

    this.element.style.webkitTransform = 'rotateX(-90deg) translateX('+(x-78)+'px) translateY(-50%) translateZ('+y+'px) scale(1.5)';
    this.element.setAttribute('class', (this.player + '-00' + (bg < 10 ? '0'+bg : bg)));
    this.gfx.style.webkitTransform = 'scaleX('+scaleX+')';
    this.x = x;
    this.y = y;
  },
  updateToCenter: function(){
    this.x += ((this.renderer.width/2)-this.x)/15
    this.update(null, null, true)
  },
  remove: function(){
  }
}