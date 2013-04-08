var debug = require('debug')('renderer:css:puck')
  , pool = require('../support/pool')
  , $ = require('jquery');

module.exports = Puck;

function Puck(){
}

Puck.prototype = {
  create: function(el, body, renderer){
    this.body = body;
    this.element = el.attr('class', 'puck')[0];
    this.sprites = 31;
    this.ghostball = 0;
    var transform = renderer.matrix + 'rotateX(-90deg) translate3d(264px, -50%, 380px) '
      , style = this.element.style;
    style.webkitTransform = style.msTransform = style.MozTransform = style.OTransform = transform;
    style.overflow = 'hidden';
    style.backgroundPosition = puckPosition[16];
    return this;
  },
  update: function(renderer, alpha){
    renderer.updatePosition(this, alpha)
    var transform = renderer.matrix + 'rotateX(-90deg) translate3d('+(this.x-26)+'px,-50%,'+(this.y+26)+'px)'
      , style = this.element.style;
    style.webkitTransform = transform;
    style.msTransform = style.MozTransform = style.OTransform = transform;

    style.backgroundPosition = puckPosition[this.sprite];

    if( this.body.data.ghostball && this.body.data.ghostball != this.ghostball ) {
      var puckClass = 'puck' + (this.body.data.ghostball == 1 ? ' ghostball' : '')
      this.ghostball = this.body.data.ghostball;
      this.element.setAttribute('class', puckClass);
    }
  },
  reset: function(){

  },
  remove: function(){
    this.element.setAttribute('class', 'empty');
    this.element.removeAttribute('style');
    Puck.free(this);
  }
}


var puckPosition = [
  '-1622px -2px',
  '-1568px -2px',
  '-1514px -2px',
  '-1460px -2px',
  '-1406px -2px',
  '-1352px -2px',
  '-1298px -2px',
  '-1244px -2px',
  '-1190px -2px',
  '-1136px -2px',
  '-1082px -2px',
  '-1028px -2px',
  '-974px -2px',
  '-920px -2px',
  '-866px -2px',
  '-812px -2px',
  '-758px -2px',
  '-704px -2px',
  '-650px -2px',
  '-596px -2px',
  '-542px -2px',
  '-488px -2px',
  '-434px -2px',
  '-380px -2px',
  '-326px -2px',
  '-272px -2px',
  '-218px -2px',
  '-164px -2px',
  '-110px -2px',
  '-56px -2px',
  '-2px -2px'
]

pool(Puck, 2)