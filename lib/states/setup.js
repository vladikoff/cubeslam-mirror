var debug = require('debug')('states:setup')
  , Game = require('../game')
  // , Network = require('./network')
  , settings = require('../settings')
  , localization = require('../localization')
  , actions = require('../actions/all')
  , Renderer = require('../renderer-debug')
  , inputs = require('mousetrap')
  , audio = require('../audio')
  , cookie = require('cookie')
  , $ = require('jquery');


var Setup = exports;

Setup.enter = function enterSetupSync(ctx){
  console.log('entering setup')
  var r = new Renderer(document.getElementById('canv-2d'))
  var g = new Game(r);
  g.actions.register(actions);

  // TODO network
  // var network = new Network()
  //   .actions(g.actions)
  //   .states(see.states);

  ctx.actions = g.actions;
  ctx.renderer = r;
  ctx.game = g;
  ctx.network = {};

  // input bindings
  inputs.bind('o',function(){ $("#settingsGUIContainer").toggle() })
  inputs.bind('8',function(){ r.triggerEvent('2d') })
  inputs.bind('9',function(){ r.triggerEvent('3d') })
  inputs.bind('0',function(){ r.triggerEvent('2d+3d') })

  localization.init(this.acceptLanguage);
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
  $('.soundSwitch').click(function() {
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
    $('.soundSwitch').removeClass('on').addClass('off');
    settings.data.sounds = false;
  } else {
    if( settings.data.music )
      audio.play("soundtrack");
    settings.data.sounds = true;
  }

  $(".notimplemented").each(function() {
    $(this).click(function() {
      alert('Not implemented yet.');
      return false;
    }).css('cursor', 'pointer');
  })
}

Setup.leave = function(){
  console.error('this should never happen...')
}
