var debug = require('debug')('renderer:css:shield')
  , cssEvent = require('css-emitter')
  , pool = require('../support/pool')
  , $ = require('jquery');

module.exports = Shield;

function Shield(){
}

Shield.prototype = {
  create: function(parent,body,world){
    var shields = world.players[body.data.player].shields.length;
    var index = body.data.index+1;
    this.body = body;
    this.bulletproof = false;
    this.element = $(parent)
      .find('.shields-'+body.data.player)
      .children().eq(index-1)
      .removeAttr('class')
      .attr('class','shield active visible s'+shields + '-' + (index<0 ? index : '0'+index))[0];
        
    this.cName = this.element.getAttribute('class').replace(' visible', ' ');
    cssEvent(this.element).off('end');

    return this;
  },
  update: function(){
    if( this.body.data.bulletproof != this.bulletproof ) {
      if(this.body.data.bulletproof==1) {
        $(this.element).addClass('bulletproof')
      } else{
        $(this.element).removeClass('bulletproof')
      }
      this.bulletproof = this.body.data.bulletproof;
    }
  },
  reset: function(){
    if(this.bulletproof)
      $(this.element).removeClass('bulletproof')
    Shield.free(this)
  },
  remove: function(){
    this.element.setAttribute('class',this.cName + ' hit');
    var c = this.cName;
    cssEvent(this.element).once('end',function(){
      $(this.element).removeClass('visible');
    }.bind(this))
    Shield.free(this)
  }
}

pool(Shield, 18)