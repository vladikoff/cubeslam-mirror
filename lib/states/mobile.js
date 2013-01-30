var $ = require('jquery')
  , see = require('../support/see');

var Mobile = exports;

Mobile.enter = function(ctx){
  // if(window.WebGLRenderingContext)
  //   return;
  //show 3dtransforms else if()
  
  $('html').addClass('mobile');

  var rect = {w: 1100, h: 850}

  var w = $(document).width() / rect.w
    , h = $(document).height() / rect.h
    , scale = (w > h) ? w : h;

    console.log( scale, w, h )

  document.getElementById('canv-css').style.webkitTransform = 'scale('+scale+')';

}

Mobile.leave = function leaveLoadingSync(ctx){
}