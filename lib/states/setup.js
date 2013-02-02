var debug = require('debug')('states:setup')
  , cookie = require('cookie')
  , inputs = require('mousetrap')
  , Game = require('../game')
  , Renderer = require('../renderer-debug')
  , Editor = require('../level-editor')
  , Network = require('../network')
  , settings = require('../settings')
  , localization = require('../localization')
  , audio = require('../audio')
  , see = require('../support/see')
  , CSSAnimation = require('../support/CSSAnimation')
  , levels = require('../levels')
  , $ = require('jquery');


var Setup = exports;


Setup.enter = function enterSetupSync(ctx){

  $("#pointer-lock").bind("click", function(){
    var el = $(this);
    el.toggleClass("enabled");
    if( el.hasClass("enabled") ) {
      el.html("Mouse lock off");
    }
    else {
      el.html("Mouse lock on");
    }
  })

  ctx.renderer = new Renderer(document.getElementById('canv-3d'))
  ctx.game = new Game(ctx.renderer);
  ctx.game.world.name = 'game'

  // manually update
  inputs.bind('.',function(){
    ctx.game.update();
    ctx.game.emit('render',ctx.game.world,0)
  })

  ctx.network = new Network(ctx)
  if( ctx.network.available ){
    // create a network game
    ctx.networkGame = new Game();
    ctx.networkGame.world.name = 'networkGame'
    see.on('enter',function(ctx,state){
      ctx.network.emit('state',ctx.pathname)
    })

    // add remote camera
    ctx.network.on('addstream',function(e){
      var remoteVideo = document.getElementById('remoteInput');
      remoteVideo.src = webkitURL.createObjectURL(e.stream);
      ctx.renderer.triggerEvent('remoteVideoAvailable', {visible:true});
    })
    ctx.network.on('removestream',function(e){
      ctx.renderer.triggerEvent('remoteVideoAvailable', {visible:false});
      document.getElementById('remoteInput').src = '';
    })
  }


  // input bindings
  inputs.bind('o',function(){ $("#settingsGUIContainer").toggle() })
  inputs.bind('8',function(){ ctx.renderer.triggerEvent('2d') })
  inputs.bind('9',function(){ ctx.renderer.triggerEvent('3d') })
  inputs.bind('0',function(){ ctx.renderer.triggerEvent('2d+3d') })
  inputs.bind('e',function(){ ctx.renderer.triggerEvent('explode') })
  inputs.bind('h',function(){ ctx.renderer.triggerEvent('heal') })
  inputs.bind('1',function(){ settings.data.fpsCamera = !settings.data.fpsCamera })

  localization.init(ctx.acceptLanguage);
  localization.on('load', function() {
    var langs = localization.availLanguages();
    if (langs.length < 2) {
      $('#localizationSwitch').closest('li').hide();
    } else {
      $('#localizationSwitch').html(langs.join('/')).click(function(e) {
        e.preventDefault();
        localization.nextLanguage();
        return false;
      });
    }
  });

  var soundList = [
    { id:"hit", url:"audio/hit2.wav", pitch:"random",loop:false,volume:1},
    { id:"hit2", url:"audio/hit3.wav", pitch:"random",loop:false,volume:1},
    { id:"miss", url:"audio/miss.wav", pitch:"",loop:false,volume:1},
    { id:"soundtrack", url:"audio/soundtrack.mp3",pitch:"",loop:true,volume:0.5}
  ]
  audio.init(soundList);

  // Sound setting is stored in a cookie:
  $('.sound-switch').on('click',function() {
    if ($(this).hasClass('on')) {
      cookie('sound', 'off');
      $(this).removeClass('on').addClass('off');
      if( settings.data.music )
        audio.stop("soundtrack");
      settings.data.sounds = false;
    } else {
      cookie('sound', 'on');
      $(this).removeClass('off').addClass('on');
      if( settings.data.music )
        audio.play("soundtrack");
      settings.data.sounds = true;
    }
    return false;
  });

  if (cookie('sound') == 'off') {
    $('.sound-switch').removeClass('on');
    settings.data.sounds = false;
  } else {
    if( settings.data.music )
      audio.play("soundtrack");
    settings.data.sounds = true;
  }

  $(".notimplemented").on('click',function(){
    alert('Not implemented yet.');
    return false;
  }).css('cursor', 'pointer');

  $('.share-url').each(function() {
    if ($(this).is('input'))
      $(this).val(document.location.href);
    else
      $(this).html(document.location.href);
    $(this).on('click',function(e){
      this.focus();
      this.select();
    })
  })


  //Hack to putting out the state-layers after transitions to prevent recalculation
  var eventTypes = CSSAnimation.getEventTypes();

  if(eventTypes.start !== undefined) {
    $(".content").each(function(){
      $(this)[0].addEventListener("transitionend", afterTransition, true);//firefox
      $(this)[0].addEventListener("webkitTransitionEnd", afterTransition, true);//webkit
    })
  }
  function afterTransition(evt){
    if( $(evt.target).parent().parent().hasClass("inactive") ) {
      $(evt.target).parent().parent().css("display","none");
    }
  }

}

Setup.leave = function(){
  throw new Error('this should never happen...')
}

