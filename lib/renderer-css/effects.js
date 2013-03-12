var debug = require('debug')('renderer:css:effects')
  , cssEvent = require('css-emitter')
  , $ = require('jquery');

module.exports = Effects;

function Effects(renderer, env){

}

Effects.puckHit = function(player){
  var elem;
  if(player == 'opponent') {
    elem = $('#canv-css .screen .hit-cpu');
  } else {
    elem = $('#canv-css .screen .hit-player');
  }
  console.log('puckhit', elem);

  setTimeout( function(){
    elem.addClass('active');
    setTimeout(function(){
      elem.removeClass('active');
      setTimeout(function(){
        elem.addClass('hidden');
      }, 600)
    }, 600)
  }, 4)
  elem.removeClass('hidden');
}

Effects.toggleFog = function(active){
  var fog = $('#canv-css .effects .effect.fog');
  if( active ) {
    fog.removeClass('hidden')
    setTimeout(function(){
      fog.addClass('active');
    }, 4)
  } else {
    setTimeout(function(){
      fog.addClass('hidden');
    }, 600);
    fog.removeClass('active');
  }
}
