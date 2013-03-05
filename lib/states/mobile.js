var debug = require('debug')('mobile')
  , settings = require('../settings')
  , keys = require('mousetrap')
  , $ = require('jquery');

var Mobile = exports;

Mobile.enter = function(ctx){
  if( !ctx.query.mobile ){
    // TODO also check for 3d transforms
    if(window.WebGLRenderingContext){
      try {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        var exts = context.getSupportedExtensions();
        return;
      } catch(e){}
    }
  }

  ctx.silent = true;
  ctx.mobile = true;
  $('html').addClass('mobile')
  $('html').css('paddingBottom', 64);
  window.scrollTo(0,0)
  $('html').css('paddingBottom', 0)

  //hack to get :active psuedo classes to work on ios.
  $('button').on('touchstart touchend', function(){});

  $('#gamepad .button:first')
    .on('mousedown touchstart', function(){ keys.trigger('left,a','keydown'); $(this).addClass('down'); return false; })
    .on('mouseup touchend', function(){ keys.trigger('left,a','keyup'); $(this).removeClass('down'); return false; })
  $('#gamepad .button:last')
    .on('mousedown touchstart', function(){ keys.trigger('right,d','keydown'); $(this).addClass('down'); return false; })
    .on('mouseup touchend', function(){ keys.trigger('right,d','keyup'); $(this).removeClass('down'); return false; })

  $('#canv-css .background')
    .css('backgroundImage', 'url('+$('#canv-css .background img.bg').data( $(document).width() > 800 ? 'src-tablet' : 'src-mobile')+')');

  var img = $('.mobile section.main-menu img').data($(document).width() > 800 ? 'src-tablet' : 'src-mobile');
  $('header.main-menu').css({backgroundImage: 'url('+img+')'});

  $(window).on('resize', function(){
    var rect = {w: 760, h: 560}
      , dw = $(document).width()
      , dh = $(document).height()
      , w = dw / rect.w
      , h = dh / rect.h
      , scale = (w > h) ? h : w;
    document.getElementById('canv-css').style.webkitTransform = 'scale('+scale+')';
    if( scale < 1.4)
      settings.data.mouseSensitivity = 1.7-scale;
    document.getElementsByTagName('body')[0].style.clip = 'rect(0, '+dw+'px, '+dh+'px, 0)'
  }).resize();
}

Mobile.leave = function(ctx, next){
  // Nothing to do...
}