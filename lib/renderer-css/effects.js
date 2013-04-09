var debug = require('debug')('renderer:css:effects')
  , cssEvent = require('css-emitter')
  , $ = require('jquery');

module.exports = Effects;

function Effects(){

}

Effects.puckHit = function(player){
  var elem;
  if(player == 'opponent') {
    elem = $('#canv-css .screen .hit-cpu');
  } else {
    elem = $('#canv-css .screen .hit-player');
  }
  cssEvent(elem[0]).once('end', function(){
    elem.removeClass('active');  
  })
  elem.addClass('active');
}

Effects.toggleFog = function(active){
  var fog = $('#canv-css .effects .effect.fog');
  if( active ) {
    fog.addClass('active')
  } else {
    fog.removeClass('active');
  }
}

//Position from 0-1, 1 is p2. 
Effects.bombBlast = function(position){
  var player = position > .5 ? 'p1' : 'p2'
    , elem = $('#canv-css .effects .effect.explosion.'+player);
  elem.addClass('active')
  setTimeout(function(){
    elem.removeClass('active');
  }, 1000)
}



Effects.mirroredControls = function( active ){
    if( Effects.mirrorEffectActive == active ) 
      active = false;
    Effects.mirrorEffectActive = active;

    if( active ) {
      $('body').addClass('mirror')
    } else {
      $('body').removeClass('mirror')
    }
}
