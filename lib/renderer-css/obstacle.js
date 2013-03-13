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
        this.element = $('.obstacle.'+this.id).show()[0];

      case 'diamond':
      case 'hexagon':
      case 'block-breakout':
      case 'block-rect':
        // TODO?
        break;

      default:
        throw new Error('unsupported obstacle: '+this.id)
    }
    return this;
  },
  remove: function(){
    this.element.style.display = 'none';
    Obstacle.free(this);
  }
}

pool(Obstacle, 2)