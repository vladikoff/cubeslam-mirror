var debug = require('debug')('mobile')
  , settings = require('../settings')
  , keys = require('mousetrap')
  , see = require('../support/see')
  , mouse = require('../support/mouse')
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
  // $('html').css('paddingBottom', 64);
  // window.scrollTo(0,0)
  // $('html').css('paddingBottom', 0)
  //
  see.on('enter',function(ctx,state){
    if(ctx.pathname.indexOf('/game')>-1) {
      // $('body').css('paddingTop', 64);
      // window.scrollTo(0,0)
    }
  })

  //hack to get :active psuedo classes to work on ios.
  $('button').on('touchstart touchend', function(){});

  $('#gamepad button:first')
    .on('mousedown touchstart', function(){ keys.trigger('left,a','keydown'); $(this).addClass('down'); return false; })
    .on('mouseup touchend', function(){ keys.trigger('left,a','keyup'); $(this).removeClass('down'); return false; })
  $('#gamepad button:last')
    .on('mousedown touchstart', function(){ keys.trigger('right,d','keydown'); $(this).addClass('down'); return false; })
    .on('mouseup touchend', function(){ keys.trigger('right,d','keyup'); $(this).removeClass('down'); return false; })

  $('footer .technology a').on('click', function(){
    see('/cssinfo');
    return false;
  })
  $('#mobile-menu button.info').on('click', function(){
    see('/game/cssinfo');
    return false;
  })

  mouse.once('move',function(){
    $('#canv-css .swipe-instruction').addClass('hide');
  })

  $('#canv-css .background')
    .css('backgroundImage', 'url('+$('#canv-css .background img.bg').data( $(document).width() > 800 ? 'src-tablet' : 'src-mobile')+')');

  $('.state.friend-invite').remove();
  $('section.state.game-pause').remove();
  $('.state.webcam-activate').remove();
  $('.state.webcam-information').remove();
  $('.state.webcam-waiting').remove();
  $('.state.webcam-arrived').remove();
  $('.state.game-wait').remove();
  $('.state.friend-accept').remove();
  $('.state.friend-left').remove();
  $('#extras').remove();

  var img = $('.mobile section.main-menu img').data($(document).width() > 800 ? 'src-tablet' : 'src-mobile');
  $('header.main-menu').css({backgroundImage: 'url('+img+')'});
  var canvasStyle = document.getElementById('canv-css').style;

  $(window).on('resize', function(){
    var rect = {w: 560, h: 500}
      , dw = $(document).width()
      , dh = $(document).height()
      , w = dw / rect.w
      , h = dh / rect.h
      , scale = (w > h) ? h : w;
    canvasStyle.webkitTransform = canvasStyle.msTransform = canvasStyle.MozTransform = canvasStyle.OTransform = 'scale('+scale+')';
    if( scale < 1.4)
      settings.data.mouseSensitivity = 1.7-scale;
    document.getElementsByTagName('body')[0].style.clip = 'rect(0, '+dw+'px, '+dh+'px, 0)'
    // document.getElementById('game').style.clip = 'rect('+-dh/2+'px, '+dw/2+'px, '+(dh/2)+'px, '+(-dw/2)+'px)'
  }).resize();
}

Mobile.leave = function(ctx, next){
  // Nothing to do...
}

exports.Info = {
  enter: function(ctx){
    if(ctx.pathname.indexOf('game') > -1)
      $('button',ctx.el).on('click',function(){ see('/game/pause') })
    else
      $('button',ctx.el).on('click',function(){ see('/main-menu') })
  },
  leave: function(ctx){
    $('button',ctx.el).off('click');
  },
  cleanup: function(ctx){
  }
}