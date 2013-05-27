var debug = require('debug')('renderer:css:shield')
  , cssEvent = require('css-emitter')
  , pool = require('../support/pool')
  , $ = require('jquery');

module.exports = Shield;

function Shield(){
}

Shield.prototype = {
  create: function(parent,body,world){
    var shields = world.players[body.data.player].shields.length
      , index = body.data.index+1
     , cName = 'shield active visible s'+shields + '-' + (index<0 ? index : '0'+index);
    this.body = body;
    this.bulletproof = false;
    this.element = $(parent)
      .find('.shields-'+body.data.player)
      .children().eq(index-1)[0];
    cssEvent(this.element).off('end');
    
    this.element.setAttribute('class', cName);
    this.cName = cName.replace(' visible', ' ');

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
    if(this.bulletproof) {
      $(this.element).removeClass('bulletproof')
    }
    cssEvent(this.element).off('end');
    Shield.free(this)
  },
  remove: function(){
    this.element.setAttribute('class',this.cName + ' hit');
    var c = this.cName;
    cssEvent(this.element).once('end',function(){
      if($(this.element).hasClass('hit')) {
        $(this.element).removeClass('visible');
      }
    }.bind(this))
    Shield.free(this)
  }
}

pool(Shield, 18)