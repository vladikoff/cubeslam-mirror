/* global _gaq: true, Stats: true */

var debug = require('debug')('states:setup')
  , keys = require('mousetrap')
  , Game = require('../game')
  , Renderer = require('../renderer')
  , Renderer2D = require('../renderer-2d')
  , Network = require('../network')
  , settings = require('../settings')
  , localization = require('../localization')
  , see = require('../support/see')
  , info = require('../support/info')
  , selectRange = require('../support/select-text')
  , cssEvent = require('css-emitter')
  , inputs = require('../inputs')
  , tracking = require('../tracking')
  , actions = require('../actions')
  , langCodes = require('../support/language-codes')
  , cookie = require('cookie')
  , sound = require('../sound')
  , $ = require('jquery')
  , dmaf = require('../dmaf.min');


var Setup = exports;


Setup.enter = function(ctx){
  ctx.query.dev = ctx.query.dev ? true : false;

  // set before 3d is created
  if( ctx.query.quality ){

    if( ctx.query.quality === settings.QUALITY_BEST || ctx.query.quality === settings.QUALITY_LOW || ctx.query.quality === settings.QUALITY_HIGH || ctx.query.quality === settings.QUALITY_MOBILE) {
      settings.data.quality = ctx.query.quality;
    }

    if(settings.data.quality == settings.QUALITY_LOW || window.devicePixelRatio > 1){
      settings.data.antialias = false;
    }

    if(ctx.query.quality === settings.QUALITY_BEST) {
      settings.data.antialias = true;
    }

    if(ctx.query.quality === settings.QUALITY_MOBILE) {
      settings.data.cameraOverlay = false;
    }
  }

  ctx.renderer = new Renderer()
  ctx.game = new Game('game',ctx.renderer);

  if( ctx.query.renderer == '2d' ){
    ctx.renderer.set(new Renderer2D(document.getElementById('canv-2d')))
  }

  // start game paused
  if( ctx.query.paused ){
    console.warn('started game in paused mode. step forward with ".".')
    ctx.game.pause();

    // manually update
    keys.bind('.',function(){
      ctx.game.update();
      ctx.game.emit('render',ctx.game.world,0)
    })
  }

  // wrap loop with stats js
  if( typeof Stats == 'function' && ctx.query.dev ){
    var stats = new Stats();
    $(stats.domElement).css({
      'letter-spacing':'normal',
      'position': 'absolute',
      'z-index': 999
    }).insertBefore('#benchmarks');
    ctx.game.on('enter frame',function(){stats.begin()})
    ctx.game.on('leave frame',function(){stats.end()})
  }

  // check for touch
  ctx.touch = 'ontouchstart' in window || navigator.msMaxTouchPoints;
  if( ctx.touch ){
    $('body').addClass('touch');
    if( !ctx.mobile ){
      settings.data.mouseSensitivity = 0.7/10;
    }
  }

  // optionally disable sounds entirely
  ctx.silent = ctx.silent || ctx.query.silent;
  if( !ctx.silent ) {
    ctx.silent = !(window.webkitAudioContext || window.AudioContext);
  }

  // no need to show sound button when silent
  ctx.silent && $('.sound').hide();
  sound(cookie('sound'),true); // true = prevent GA tracking first time

  // enable dmaf logs
  dmaf.log = ctx.query.dmaf;

  stateHack();
  socialPopup();
  trackExternalLinks();

  // networking
  setupNetwork(ctx);

  // key bindings
  setupBindings(ctx);

  // init localization
  localize(ctx.query.lang || ctx.acceptLanguage)

  // toggle debug info
  //info(ctx,ctx.dev || ctx.query.dev)
  info(ctx, ctx.query.dev)
  $('#debug-info').toggle(ctx.query.dev)
  //$('#debug-info').toggle(ctx.dev || ctx.query.dev)
}

Setup.leave = function(){
  throw new Error('this should never happen...')
}

function trackExternalLinks(){
  $('#footer [target=_blank]').on('click', function(){
    _gaq.push(['_trackEvent', 'outbound links', $(this).attr('href')]);
  })
  $('header').addClass('delay');
}

function localize(acceptLanguage){
  localization.parse(acceptLanguage);
  localization.load(function(){
    // console.log('loaded languages',localization.availableLanguages)

    // hide the language selector when only english
    if( localization.availableLanguages.length < 2 ){
      $('#localizationSwitch').closest('li').hide();

    // toggle between default language and other language
    } else {
      var next = localization.nextLanguage(true);
      var lang = langCodes.name(next)
      $('#localizationSwitch').html(lang).click(function(e){
        e.preventDefault();
        var lang = langCodes.name(localization.currentLanguage);
        $('#localizationSwitch').html(lang)
        localization.nextLanguage();
        _gaq.push(['_trackEvent', 'localization','switch', localization.currentLanguage]);
      })
    }
  })
}

function stateHack(){
  $('.state.inactive').hide().css('visibility', 'visible')
  //Hack to putting out the state-layers after transitions to prevent recalculation
  $('.state .animate').add($('.state.animate')).each(function(){
    cssEvent(this).on('end',afterTransition)
  })
  function afterTransition(evt){
    var stateElem = $(evt.target).hasClass('state') ? $(evt.target) : $(evt.target).closest('.state');
    if( !stateElem.hasClass('active') ){
      stateElem.hide();
    }
  }
}

function socialPopup(){

  $('.social a').on('mouseover', function(){
    dmaf.tell('share_over');
  })

  $('.social a').on('click', function(){
    dmaf.tell('share_click');
    var href = $(this).attr('href');
    _gaq.push(['_trackEvent', 'share', href]);
    window.open(href, 'Cube Slam', 'toolbar=0,status=0,width=626,height=480')
    return false;
  })
}

function setupNetwork(ctx){
  ctx.network = new Network(ctx)

  // skipping network when mobile
  if( ctx.mobile ){
    return;
  }

  // show error when network
  // is not available.
  if( !ctx.network.available ){
    return;
  }

  // update debug info
  ctx.game.on('post update',function(){ info(ctx) })

  see.on('enter',function(ctx,state){
    ctx.network.emit('state',ctx.pathname)
  })

  // make a sound when a friend connects
  ctx.network.on('connected',function(){
    dmaf.tell('friend_join');
  })

  // update the inputs latency
  ctx.network.on('change latency',function(latency){
    if( latency === null ){
      $('#multiplayer-notification').stop().hide();
      $('#latencyMeter span').closest('li').addClass('inactive')
      return
    }

    var quality = latency > 150 ? 'bad'
                : latency > 50 ? 'ok'
                : 'good';

    $('#latencyMeter span').text(latency).removeClass('ok good bad').addClass(quality)
      .closest('li').removeClass('inactive')

    if(quality != 'good') {
      $('#multiplayer-notification').stop().hide();
      var notification = $('#latency-notification:not(.inactive)').addClass('active');
      if(notification.length > 0){
        //_gaq.push(['_trackEvent', '2p', 'latency',undefined,parseInt(latency,10)]);
        notification.addClass('inactive').fadeOut(0)
          .fadeIn(200).delay(12000).fadeOut(200);
      }
    }

    //store and calculate average in end of round
    tracking.latency.push( latency );
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
  ctx.network.on('full', function(){
    $('body').addClass('error room-full')
    //ctx.network.close()
    see('/error/fullroom');

  })

  ctx.network.on('timeout',function(){
    console.warn('connection timed out')

    _gaq.push(['_trackEvent', 'error', 'connection timed out']);

    // abort unless loading
    if( ctx.pathname != '/loading' ){
      see.abort();
    }
    see('/error/connection');
  })

  ctx.network.on('error', function(e){
    console.error(e.stack)
    console.log(info(ctx))

    _gaq.push(['_trackEvent', 'error', e.message]);
    ctx.network.close()

    // abort unless loading
    if( ctx.pathname != '/loading' ){
      see.abort();
    }
    see('/error/connection');
  })

  ctx.network.on('connected',function(){
    if( ctx.pathname != '/loading' ){
      see.abort()
    }

    dmaf.tell('microphone_on');
    sound('off', true, true)
    //show and hide notification flag
    $('#multiplayer-notification').fadeOut(0)
      .fadeIn(200).delay(8000).fadeOut(200);

    if(this.winner){
      see('/friend/arrived');
    } else {
      see('/friend/waiting');
    }
  })
  ctx.network.on('disconnected', function(){
    if( ctx.pathname != '/loading' ){
      see.abort()
    }
    dmaf.tell('microphone_off');
    sound(cookie('sound'))
    see('/friend/left')
    // make sure we reactivate the webcam
    // ctx.webcam = false;
  })

  if( ctx.room !== 'offline' ){
    ctx.network.setupRemote({
      dataChannels: 'game',
      bufferCandidates: ctx.query.buffer || ctx.dev,
      signal: ctx.query.signal,

      // options for WebSocketSignal
      url: 'ws://nj.publicclass.co:8090/'+ctx.room,

      // options for AppChannelSignal
      room: ctx.room,

      // request TURN credentials
      turnConfigURL: 'https://computeengineondemand.appspot.com/turn?username=apa&key=1329412323'
    })
  }
}

function setupBindings(ctx){
  // input bindings
  keys.bind('o',function(){
    $('#settingsGUIContainer,#debug-info').toggle();
    info(ctx,$('#debug-info').is(':visible'))
  })
  keys.bind('p',function(){ actions.createPuckCenter(ctx.game.world) })
  keys.bind('e',function(){ ctx.renderer.triggerEvent('explode') })
  keys.bind('h',function(){ ctx.renderer.triggerEvent('heal') })
  keys.bind('m',function(){
    settings.data.debugMirror = !settings.data.debugMirror
    ctx.renderer.triggerEvent('mirrorEffect',{active:settings.data.debugMirror})
  })

  //camera
  for (var i = 1; i < 6; i++) {
    keys.bind(String(i),function(index){
      settings.data.cameraType = index-1;
      settings.emit('cameraTypeChanged')
    }.bind(null,i))
  }
  keys.bind('c',function(){
    ctx.renderer.triggerEvent('trace-camera')
  })

  var r2d = new Renderer2D(document.getElementById('canv-2d'))
    , rXd;
  keys.bind('0',function(){
    // toggle between the 2d renderer and the current one
    if( ctx.renderer.impl !== r2d ){
      rXd = ctx.renderer.impl;
      ctx.renderer.set(r2d)
      $(rXd.canvas || rXd.element).hide();
      $(r2d.canvas).show()
    } else if( rXd ){
      ctx.renderer.set(rXd);
      $(r2d.canvas).hide();
      $(rXd.canvas || rXd.element).show();
    }
  })
}
