var $ = require('jquery')
  , see = require('../support/see');

var Mobile = exports;

Mobile.enter = function(ctx){
  // if(window.WebGLRenderingContext)
  //   return;
  //show 3dtransforms else if()
  
  $('html').addClass('mobile');
  $('#canv-css .background img').attr('src', $('#canv-css .background img').data('src'));

  $(window).on('resize', function(){
    // $('body').width($(document).width())
    // $('body').height($(document).height())
    var rect = {w: 1200, h: 700}
      , w = $(document).width() / rect.w
      , h = $(document).height() / rect.h
      , scale = (w > h) ? h : w;
    document.getElementById('game').style.webkitTransform = 'scale('+scale+')';
  }).resize();

}

Mobile.leave = function leaveLoadingSync(ctx){
}