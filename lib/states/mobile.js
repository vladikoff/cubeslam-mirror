var debug = require('debug')('mobile')
  , settings = require('../settings')
  , keys = require('mousetrap')
  , see = require('../support/see')
  , mouse = require('../support/mouse')
  , localization = require('../localization')
  , $ = require('jquery');

var Mobile = exports;

Mobile.enter = function(ctx){
  if( ctx.query.quality != 'mobile' && navigator.userAgent.toLowerCase().indexOf('android') > -1 ) {
    ctx.query.mobile = true;
  }
  if( !ctx.query.mobile && hasWebGL() ){
    return;
  }
  ctx.mobile = true;
  ctx.query.renderer = ctx.query.renderer || 'css';
  $('html').addClass('mobile')

  var img = $('.mobile section.main-menu img').data($(document).width() > 800 ? 'src-tablet' : 'src-mobile');
  $('header.main-menu').css({backgroundImage: 'url('+img+')'});

  //activate fallback page if no csstransform support
  //if(!has3d() || !Modernizr.csstransforms3d ) {

  if(!has3d()) {
    $('header.main-menu').removeClass('inactive').addClass('active');
    $('header.main-menu .nav').hide();
    $('.loading').hide();
    see.abort();
    localize(ctx.acceptLanguage);
    see('/error/browser');
    return;
  }

  if( $('body').hasClass('room-lonely') ) {
    see.abort();
    $('header.main-menu').addClass('active');
    $('header.main-menu .nav').hide();
    $('#footer').hide();
    $('.loading').remove();
    localize(ctx.acceptLanguage)
    see('/error/lonelyroom');
    return;
  }


  //iPhone hack to get rid of omnibar.
  // we need at least 64px extra height and scrollto 0 to remove the bar.
  var iphoneOmnibar = 64;
  // $('#footer').css('paddingBottom', iphoneOmnibar);
  window.scrollTo(0,1)
  see.on('enter',function(ctx,state){
    if(ctx.pathname.indexOf('/game/')>-1) {
      // window.scrollTo(0,1);
    }
  })
  // window.onorientationchange = function() {
  //   window.scrollTo(0,0)
  // }

  //hack to get :active psuedo classes to work on ios.
  $('button').on('touchstart', function(){$(this).addClass('down')});
  $('button').on('touchend', function(){$(this).removeClass('down')});

  $('#gamepad button:first')
    .on('mousedown touchstart', function(){ keys.trigger('left,a','keydown'); $(this).addClass('down'); return false; })
    .on('mouseup touchend', function(){ keys.trigger('left,a','keyup'); $(this).removeClass('down'); return false; })
  $('#gamepad button:last')
    .on('mousedown touchstart', function(){ keys.trigger('right,d','keydown'); $(this).addClass('down'); return false; })
    .on('mouseup touchend', function(){ keys.trigger('right,d','keyup'); $(this).removeClass('down'); return false; })

  $('footer .technology a').on('click', function(e){
    if(ctx.pathname.indexOf('game') < 0){
      see('/cssinfo');
    } else {
      if( ctx.pathname.indexOf('over') > -1 ){
        see('/game/over/cssinfo');
      } else {
        see('/game/cssinfo');
      }
    }
    e.stopImmediatePropagation();
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

  var c = document.getElementById('canv-css').style;
  $(window).on('resize', function(){
    var rect = {w: 560, h: 500}
      , dw = $(window).width()
      , dh = $(window).height()
      , w = dw / rect.w
      , h = dh / rect.h
      , scale = (w > h) ? h : w;
    c.transform = c.webkitTransform = c.msTransform = c.MozTransform = c.OTransform = 'scale('+scale+') translateZ(0)';
    if( scale < 1.8){
      settings.data.mouseSensitivity = (1.8-scale)/10;
    }
  }).resize();
}

Mobile.leave = function(ctx, next){
  // Nothing to do...
}

exports.Info = {
  enter: function(ctx){
    ctx.el.scrollTop(0,0);
    if(ctx.pathname.indexOf('game') > -1) {
      if(ctx.pathname.indexOf('over') > -1) {
        $('button',ctx.el).on('click',function(){ see('/game/over') })
      } else {
        $('button',ctx.el).on('click',function(){ see('/game/pause') })
      }
    } else {
      $('button',ctx.el).on('click',function(){ see('/main-menu') })
    }
  },
  leave: function(ctx){
    $('button',ctx.el).off('click');
  },
  cleanup: function(ctx){
  }
}

function hasWebGL(){
  if(window.WebGLRenderingContext){
    try {
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if( context ){
        return true;
      } else {
        console.warn('webgl was not available. you might want to visit http://get.webgl.org/troubleshooting/')
      }
    } catch(e){
      console.error(e)
    }
  }
  return false;
}

function has3d() {
  var el = document.createElement('p'),
    has,
    transforms = {
      'webkitTransform':'-webkit-transform',
      'OTransform':'-o-transform',
      'msTransform':'-ms-transform',
      'MozTransform':'-moz-transform',
      'transform':'transform'
    };

  // Add it to the body to get the computed style.
  document.body.insertBefore(el, null);

  for (var t in transforms) {
    if (el.style[t] !== undefined) {
      el.style[t] = 'translate3d(1px,1px,1px)';
      has = window.getComputedStyle(el).getPropertyValue(transforms[t]);
    }
  }

  document.body.removeChild(el);


  //Check for preserve3d
  var element = document.createElement('p'),
      html = document.getElementsByTagName('HTML')[0],
      body = document.getElementsByTagName('BODY')[0],
      properties = {
        'webkitTransformStyle':'-webkit-transform-style',
        'MozTransformStyle':'-moz-transform-style',
        'msTransformStyle':'-ms-transform-style',
        'transformStyle':'transform-style'
      };

    body.insertBefore(element, null);

    for (var i in properties) {
      if (element.style[i] !== undefined) {
        element.style[i] = 'preserve-3d';
      }
    }

    var st = window.getComputedStyle(element, null),
        transform = st.getPropertyValue('-webkit-transform-style') ||
                    st.getPropertyValue('-moz-transform-style') ||
                    st.getPropertyValue('-ms-transform-style') ||
                    st.getPropertyValue('transform-style');

    if(transform!=='preserve-3d'){
      has = undefined;
    }
    document.body.removeChild(element);

  return (has !== undefined && has.length > 0 && has !== 'none');
}

function localize(acceptLanguage){
  localization.parse(acceptLanguage);
  localization.load()
}