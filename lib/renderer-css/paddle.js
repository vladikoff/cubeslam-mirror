var debug = require('debug')('renderer:css:padde')
  , dmaf = require('../dmaf.min')
  , $ = require('jquery');

module.exports = Paddle;

var elem = $('<div class="paddle player"><div class="gfx"></div></div>');

function Paddle(parent, player){
  this.sprites = 31;
  this.width = 179;
  this.player = player;
  this.element = elem.clone()
    .attr('id', player)
    .appendTo($(parent).find('.arena'))[0];

  this.gfx = this.element.children[0];
  this.sprite = 1;
  this.px = 0;
  this.scaleX = 1;
  //animate back with this amount of 'ease'
  this.centerAlpha = 6 + Math.random() * 20;
  this.resized = null;
  this.gfx.style.backgroundPosition = paddlePosition[this.player][this.player == 'p2' ? 0 : 15];
}

Paddle.prototype = {
  update: function(renderer, alpha, body, center){
    var gfxScale;

    if(body) {
      if(!this.body) {
        this.body = body;
      }

      renderer.updatePosition(this, alpha)

      var oldCname = this.cName;
      this.cName = '';

      // fireball (1=turn on, 2=turn off, undefined/0=ignore)
      if( body.data.fireball ) {
        body.data.fireball = toggleEffect(this,'fireball',body.data.fireball)
      }
      // laser (1=turn on, 2=turn off, undefined/0=ignore)
      if( body.data.laser ) {
        body.data.laser = toggleEffect(this,'laser',body.data.laser)
      }
      if(oldCname!=this.cName) {
        this.element.setAttribute('class', this.cName);
      }

      if(this.resized != body.data.resized) {
        var sc = body.data.resized ? body.data.resized : 1
          , dmafId = (this.player == 'p1' ?'user':'opponent') + '_paddle_'  + (sc > this.scaleX ?'grow':'shrink');
        dmaf.tell(dmafId);
        gfxScale = 'scaleX('+sc+')';
        this.scaleX = sc;
        this.resized = body.data.resized;
      }

    } else {
      var w = this.width*renderer.arenaScaleW
      this.sprite = parseInt((this.x-w)/(renderer.width-w*2) * (this.sprites-1), 10)+1;
      if(this.scaleX != 1) {
        gfxScale = 'scaleX(1)';
      }
      this.scaleX = 1;
    }
    if(gfxScale) {
      var s = this.gfx.style;
      s.transform = s.webkitTransform = s.msTransform = s.MozTransform = gfxScale;
    }

    if(Math.abs(this.px - this.x) < 1) {
      return;
    }

    var transform = renderer.matrix + 'rotateX(-90deg) translate3d('+(this.x-89)+'px,-50%,'+this.y+'px)'
      , style = this.element.style;

    style.transform = style.webkitTransform = style.msTransform = style.MozTransform = transform;
    if(this.player=='p1') {
      this.gfx.style.backgroundPosition = paddlePosition[this.player][this.sprite];
    }

    this.px = this.x;
  },
  updateToCenter: function(renderer){
    this.x += ((renderer.width/2)-this.x)/this.centerAlpha
    this.update(renderer)
  },
  remove: function(){
  }
}

function toggleEffect(paddle,prop,state){
  if(state === 1 && !paddle[prop]) {
    paddle.cName += ' ' + prop;
    paddle[prop] = state;
    return state;
  }
  else if(state === 2 && paddle[prop]) {
    paddle[prop] = 0;
    return 0; // set state back to 0
  }
  else if(paddle[prop]) {
    // skin.update();
    paddle.cName += ' ' + prop;
    return state;
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