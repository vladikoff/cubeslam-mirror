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
    var transform = renderer.matrix + 'rotateX(-90deg) translate3d(277px,-50%,380px) '
      , style = this.element.style;
    style.webkitTransform = style.msTransform = style.MozTransform = style.OTransform = transform;
    style.overflow = 'hidden';
    style.backgroundPosition = puckPosition[15];
    return this;
  },
  update: function(renderer, alpha){
    renderer.updatePosition(this, alpha)
    var transform = renderer.matrix + 'rotateX(-90deg) translate3d('+(this.x-23)+'px,-50%,'+(this.y+23)+'px)'
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
  '-1442px -2px',
  '-1394px -2px',
  '-1346px -2px',
  '-1298px -2px',
  '-1250px -2px',
  '-1202px -2px',
  '-1154px -2px',
  '-1106px -2px',
  '-1058px -2px',
  '-1010px -2px',
  '-962px -2px',
  '-914px -2px',
  '-866px -2px',
  '-818px -2px',
  '-770px -2px',
  '-722px -2px',
  '-674px -2px',
  '-626px -2px',
  '-578px -2px',
  '-530px -2px',
  '-482px -2px',
  '-434px -2px',
  '-386px -2px',
  '-338px -2px',
  '-290px -2px',
  '-242px -2px',
  '-194px -2px',
  '-146px -2px',
  '-98px -2p',
  '-50px -2px',
  '-2px -2px'
]

pool(Puck, 2)