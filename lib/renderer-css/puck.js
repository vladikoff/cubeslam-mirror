var debug = require('debug')('renderer:css:puck')
  , Effects = require('./effects')
  , pool = require('../support/pool')
  , $ = require('jquery');

module.exports = Puck;

function Puck(){
}

Puck.prototype = {
  create: function(piece, body, renderer){
    this.piece = piece;
    this.element = piece.element.attr('class', 'puck')[0];
    this.body = body;
    this.sprites = 31;
    this.ghostball = 0;
    this.fireball = 0;
    var transform = renderer.matrix + 'rotateX(-90deg) translate3d(264px, -50%, 380px) '
      , style = this.element.style;
    style.transform = style.webkitTransform = style.msTransform = style.MozTransform = style.OTransform = transform;
    style.overflow = 'hidden';
    style.backgroundPosition = puckPosition[16];
    return this;
  },
  update: function(renderer, alpha){
    renderer.updatePosition(this, alpha)
    var transform = renderer.matrix + 'rotateX(-90deg) translate3d('+(this.x-26)+'px,-50%,'+(this.y+26)+'px)'
      , style = this.element.style;
    style.transform = style.webkitTransform = style.msTransform = style.MozTransform = style.OTransform = transform;

    var oldCname = this.cName
      , puckBody = this.body;
    this.cName = 'puck';

    toggleEffect(this,'fireball',puckBody.data.fireball)
    toggleEffect(this,'ghostball',puckBody.data.ghostball)

    // bomb (1=turn on, 2=turn off, undefined/0=ignore) 
    if( puckBody.data.timebomb ) {
      if( puckBody.data.timebomb == 2) {
        Effects.bombBlast(this.y/renderer.height)
      }
      toggleEffect(this,'timebomb',puckBody.data.timebomb)
    }
    
    if(oldCname!=this.cName) {
      this.element.setAttribute('class', this.cName);

    }

    if( this.sprite != this.oldSprite ) {
      if(this.fireball==1) {
        style.backgroundPosition = fireBallPosition[this.sprite];
      } else {
        style.backgroundPosition = puckPosition[this.sprite];
      }
      this.oldSprite = this.sprite;
    }

  },
  reset: function(){

  },
  remove: function(){
    this.piece.remove();
    Puck.free(this);
  }
}

function toggleEffect(puck,prop,state){
  if( state === 1 && !puck[prop] ) {
    puck[prop] = state;
    return state;
  } else if( (state === 2 || state === 0) && puck[prop] ) {
    puck[prop] = 0
    return 0; // set state back to 0
  } else if( puck[prop] ) {
    // skin.update();
    puck.cName += ' ' + prop;
    return state;
  }
}


var puckPosition = [
  '-1622px -56px',
  '-1622px -2px',
  '-1568px -56px',
  '-1568px -2px',
  '-1514px -56px',
  '-1514px -2px',
  '-1460px -56px',
  '-1460px -2px',
  '-1406px -56px',
  '-1406px -2px',
  '-1352px -56px',
  '-1352px -2px',
  '-1298px -56px',
  '-1298px -2px',
  '-1244px -56px',
  '-1244px -2px',
  '-1190px -56px',
  '-1190px -2px',
  '-1136px -56px',
  '-1136px -2px',
  '-1082px -56px',
  '-1082px -2px',
  '-1028px -56px',
  '-1028px -2px',
  '-974px -56px',
  '-974px -2px',
  '-920px -56px',
  '-920px -2px',
  '-866px -56px',
  '-866px -2px',
  '-812px -56px'
]

var fireBallPosition = [
  '-812px -2px',
  '-758px -56px',
  '-758px -2px',
  '-704px -56px',
  '-704px -2px',
  '-650px -56px',
  '-650px -2px',
  '-596px -56px',
  '-596px -2px',
  '-542px -56px',
  '-542px -2px',
  '-488px -56px',
  '-488px -2px',
  '-434px -56px',
  '-434px -2px',
  '-380px -56px',
  '-380px -2px',
  '-326px -56px',
  '-326px -2px',
  '-272px -56px',
  '-272px -2px',
  '-218px -56px',
  '-218px -2px',
  '-164px -56px',
  '-164px -2px',
  '-110px -56px',
  '-110px -2px',
  '-56px -56px',
  '-56px -2px',
  '-2px -56px',
  '-2px -2px'
]

pool(Puck, 2)