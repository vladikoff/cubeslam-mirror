var $ = require('jquery')
  , settings = require('../settings')
  , see = require('../support/see');

var Mobile = exports;

Mobile.enter = function(ctx){
  // if(window.WebGLRenderingContext)
  //   return;
  //show 3dtransforms else if()

  $('html').addClass('mobile').css('paddingBottom', 64);
    window.scrollTo(0,0)
  $('html').css('paddingBottom', 0)

  $('#canv-css .background img').attr('src', $('#canv-css .background img').data('src'));
  $(window).on('resize', function(){
    var rect = {w: 1200, h: 700}
      , dw = $(document).width()
      , dh = $(document).height()
      , w = dw / rect.w
      , h = dh / rect.h
      , scale = (w > h) ? h : w;
    document.getElementById('canv-css').style.webkitTransform = 'scale('+scale+')';
    if( scale < 1)
      settings.data.mouseSensitivity = 1-scale;
    document.getElementsByTagName('body')[0].style.clip = 'rect(0, '+dw+'px, '+dh+'px, 0)'
  }).resize();

}

Mobile.leave = function leaveLoadingSync(ctx){
}