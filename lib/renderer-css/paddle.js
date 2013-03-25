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
    var transform = renderer.matrix + 'rotateX(-90deg) translate3d('+(this.x-78)+'px,-50%,'+this.y+'px)'
      , style = this.element.style;

    style.webkitTransform = transform;
    style.msTransform = style.MozTransform = style.OTransform = transform;

    // this.element.setAttribute('class', (this.player + '-00' + (this.sprite < 10 ? '0'+this.sprite : this.sprite)));
    this.gfx.style.webkitTransform = 'scaleX('+this.scaleX+')';
    this.gfx.style.backgroundPosition = paddlePosition[this.player][this.sprite];
  },
  updateToCenter: function(renderer){
    this.x += ((renderer.width/2)-this.x)/this.centerAlpha
    this.update(renderer, null, null)
  },
  remove: function(){
  }
}

var paddlePosition = {
  p1: [
    '-1582px -50px',
    '-1424px -50px',
    '-1582px -2px',
    '-1424px -2px',
    '-1266px -98px',
    '-1266px -50px',
    '-1266px -2px',
    '-1108px -98px',
    '-1108px -50px',
    '-1108px -2px',
    '-950px -98px',
    '-950px -50px',
    '-950px -2px',
    '-792px -98px',
    '-792px -50px',
    '-792px -2px',
    '-634px -98px',
    '-634px -50px',
    '-634px -2px',
    '-476px -98px',
    '-476px -50px',
    '-476px -2px',
    '-318px -98px',
    '-318px -50px',
    '-318px -2px',
    '-160px -98px',
    '-160px -50px',
    '-160px -2px',
    '-2px -98px',
    '-2px -50px',
    '-2px -2px'
  ],
  p2:[
    '-318px -389px',
    '-160px -389px',
    '-318px -346px',
    '-160px -346px',
    '-318px -303px',
    '-160px -303px',
    '-318px -260px',
    '-160px -260px',
    '-2px -432px',
    '-2px -389px',
    '-2px -346px',
    '-2px -303px',
    '-2px -260px',
    '-318px -217px',
    '-160px -217px',
    '-2px -217px',
    '-318px -174px',
    '-160px -174px',
    '-2px -174px',
    '-318px -131px',
    '-160px -131px',
    '-2px -131px',
    '-318px -88px',
    '-160px -88px',
    '-2px -88px',
    '-318px -45px',
    '-160px -45px',
    '-2px -45px',
    '-318px -2px',
    '-160px -2px',
    '-2px -2px'
  ]
}