var debug = require('debug')('renderer:css:padde')
  , $ = require('jquery');

module.exports = Paddle;

var elem = $('<div class="paddle player"><div class="gfx"></div></div>');

function Paddle(parent, player){
  this.sprites = 31;
  this.width = 179;
  this.player = player;
  this.element = elem.clone().attr('id', player).appendTo($(parent).find('.arena'))[0];

  this.gfx = this.element.children[0];
  this.centerAlpha = 10 + Math.random() * 15;
  this.sprite = 1;
  this.px = 0;
  this.scaleX = 1;
  this.gfx.style.backgroundPosition = paddlePosition[this.player][this.player == 'p2' ? 0 : 15];
}

Paddle.prototype = {
  update: function(renderer, alpha, body, center){
    if(body) {
      this.body = body;
      renderer.updatePosition(this, alpha)
      var sx = this.scaleX
      this.scaleX = body.data.resized || 1

      //TODO Add laser indication
      // if(body.data.laser != this.laser)
    } else {
      this.scaleX = 1;
      var w = this.width*renderer.arenaScaleW
      this.sprite = parseInt((this.x-w)/(renderer.width-w*2) * (this.sprites-1))+1
    }

    if( Math.abs(this.px - this.x) < 1 )
      return;

    var transform = renderer.matrix + 'rotateX(-90deg) translate3d('+(this.x-89)+'px,-50%,'+this.y+'px)'
      , style = this.element.style;

    this.px = this.x;

    style.webkitTransform = transform;
    style.msTransform = style.MozTransform = style.OTransform = transform;

    // this.element.setAttribute('class', (this.player + '-00' + (this.sprite < 10 ? '0'+this.sprite : this.sprite)));
    this.gfx.style.webkitTransform = 'scaleX('+this.scaleX+')';
    if(this.player=='p1')
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
    '-1088px -167px',
    '-1269px -112px',
    '-1088px -112px',
    '-1269px -57px',
    '-1088px -57px',
    '-1269px -2px',
    '-1088px -2px',
    '-907px -167px',
    '-907px -112px',
    '-907px -57px',
    '-907px -2px',
    '-726px -167px',
    '-726px -112px',
    '-726px -57px',
    '-726px -2px',
    '-545px -167px',
    '-545px -112px',
    '-545px -57px',
    '-545px -2px',
    '-364px -167px',
    '-364px -112px',
    '-364px -57px',
    '-364px -2px',
    '-183px -167px',
    '-183px -112px',
    '-183px -57px',
    '-183px -2px',
    '-2px -167px',
    '-2px -112px',
    '-2px -57px',
    '-2px -2px'
  ],
  p2:[
    '0px 0px'
  ]
}