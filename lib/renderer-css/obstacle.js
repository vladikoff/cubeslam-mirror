var debug = require('debug')('renderer:css:effects')
  , cssEvent = require('css-emitter')
  , pool = require('../support/pool')
  , $ = require('jquery');

module.exports = Obstacle;

function Obstacle(){
}

Obstacle.prototype = {
  create: function(body) {
    this.body = body;
    this.id = body.data.id;
    switch(this.id) {
      case 'triangle-right':
      case 'triangle-left':
      case 'diamond':
      case 'octagon':
      case 'block-rect':
        this.element = $('.obstacle.'+this.id).addClass('active')[0];
      case 'block-breakout':
        // TODO?
        break;

      default:
        throw new Error('unsupported obstacle: '+this.id)
    }
    return this;
  },
  remove: function(){
    $(this.element).removeClass('active');
    Obstacle.free(this);
  }
}

pool(Obstacle, 2)