var debug = require('debug')('renderer:css')
  , cssEvent = require('css-emitter')
  , $ = require('jquery');

module.exports = Shield;

function Shield(parent,body,world){
  this.element = $(parent)
    .find('.shields-'+body.data.player)
    .find('.shield-'+parseInt(body.data.index+1))[0];
    this.element.style.display = 'block';
  this.cName = this.element.getAttribute('class').replace(' visible', '');

  cssEvent(this.element).off('end');

  setTimeout( function(){
    this.element.setAttribute('class',this.cName + ' visible');
  }.bind(this), 4)
}

Shield.prototype = {
  update: function(){

  },
  reset: function(){

  },
  remove: function(){
    this.element.setAttribute('class',this.cName + ' hit');
    cssEvent(this.element).once('end',function(){
      this.element.style.display = 'none';
    }.bind(this))
  }
}