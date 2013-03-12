var debug = require('debug')('renderer:css:effects')
  , cssEvent = require('css-emitter')
  , $ = require('jquery');

module.exports = Effects;

function Effects(renderer, env){

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
