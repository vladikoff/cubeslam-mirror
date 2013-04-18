var inputs = require('mousetrap')
  , see = require('../support/see')
  , cookie = require('cookie')
  , settings = require('../settings')
  , actions = require('../actions')
  , sound = require('../sound')
  , $ = require('jquery')
  , dmaf = require('../dmaf.min');

var MainMenu = exports;

MainMenu.enter = function(ctx){
  dmaf.tell('splash_screen')
  ctx.renderer.changeView('main-menu');

  document.addEventListener( 'visibilitychange', function ( event ) {
    document.hidden?dmaf.tell('inactive'):dmaf.tell('active');
  }, false );

  // webkit
  document.addEventListener( 'webkitvisibilitychange', function ( event ) {
    document.webkitHidden?dmaf.tell('inactive'):dmaf.tell('active');
  }, false );

  $('#about').find('li').off('mousedown').on('mousedown', function(evt){
    dmaf.tell('text_button_down', {className:evt.currentTarget.className})
  }).off('mouseover').on('mouseover', function(evt){
    dmaf.tell('text_button_over', {className:evt.currentTarget.className})
  })

  $('#socials').find('li').off('mousedown').on('mousedown', function(evt){
    dmaf.tell('small_button_down', {className:evt.currentTarget.className})
  }).off('mouseover').on('mouseover', function(evt){
    dmaf.tell('small_button_over', {className:evt.currentTarget.className})
  })

  $('button').off('mousedown').on('mousedown', function(evt){
    dmaf.tell('button_down', {className:evt.currentTarget.className})
  }).off('mouseover').on('mouseover', function(evt){
    dmaf.tell('button_over',{className:evt.currentTarget.className})
  })


  $('header.main-menu .links a').off('click').on('click', function(){
    _gaq.push(['_trackEvent', 'outbound links', $(this).attr('href')]);
  })

  // check sound setting (stored in a cookie)
  sound(cookie('sound'),true); // true = prevent GA tracking first time
  $('.sound-switch').click(function(){sound()})

  var friend = $('.play-friend',ctx.el)
    , comp = $('.start',ctx.el);
  friend.on('click',function(){
    if($('body').hasClass('room-full'))
      return see('/error/fullroom');
    if(!ctx.network.available)
      return see('/error/datachannels');
    switch(ctx.network.pathname){
      case '/friend/arrived':
        return see('/friend/accept');
      case '/friend/invite':
      case '/friend/waiting':
        return see('/friend/arrived');
      default:
        return see('/friend/invite');
    }
  })
  //.prop('disabled',!ctx.network.available)

  this.waitingFor = function(pathname){
    if( ctx.network.pathname == '/friend/invite' ){
      see('/friend/waiting')
    }
  }
  ctx.network.on('change pathname',this.waitingFor)
  if( ctx.network.pathname == '/friend/invite' ){
    see('/friend/waiting')
  }

  comp.on('click', function(){
    see('/game/instructions')
  });

  inputs.bind('space',function(){
    comp.click()
  })

  if( ctx.query.extras ) {
    var extras = ctx.query.extras.split(",");
    var len = extras.length;
    if( extras.length > 0 ) {
      settings.data.overrideSpawnExtras = true;
      for (var i = 0; i < len; i++) {
        if( settings.data.spawnExtras.hasOwnProperty(extras[i]) ){
          settings.data.spawnExtras[extras[i]] = true;
        }
      };
    }
  }

  if( ctx.query.god ) {
    settings.data.godMode = true;
  }

  if( ctx.query.momentum == 'off' ){
    settings.data.paddleMomentum = false;
  }

  if( !isNaN(ctx.query.framerate) ){
    var framerate = parseInt(ctx.query.framerate);
    settings.data.framerate = framerate;
    settings.data.timestep = 1000/framerate;
  }

  if( !isNaN(ctx.query.speed) ){
    var speed = parseInt(ctx.query.speed);
    settings.data.unitSpeed = speed;
  }

  if( ctx.query.quality ){
    if(ctx.query.quality == settings.QUALITY_HIGH || ctx.query.quality == settings.QUALITY_LOW ) {
      settings.data.quality = ctx.query.quality;  
    }
  }

  if( ctx.query.dev ) {
    _gaq.push(['_trackEvent', 'settings', 'dev enabled']);
    settings.createGenericUI( {isMobile:ctx.mobile, isNetwork: ctx.network.available})
  }

  // auto route
  if(ctx.query.see) {
    if( ctx.query.noleave ) {
      see.abort();
    }
    see(ctx.query.see);
  } else if( ctx.query.play ){
    see('/game/instructions')
  }

}

MainMenu.leave = function(ctx){
  ctx.network.off('change pathname',this.waitingFor);
  $('.delay',$(ctx.el)).removeClass('delay')
  $('.play-friend',ctx.el).off('click')
  $('.start',ctx.el).off('click')
  inputs.unbind('space')
}