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
  , actions = require('../actions')
  , $ = require('jquery')
  , dmaf = require('../dmaf.min');


var Setup = exports;


Setup.enter = function(ctx){
  ctx.renderer = new Renderer()
  ctx.game = new Game('game',ctx.renderer);

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

  // check for touch
  ctx.touch = 'ontouchstart' in window || navigator.msMaxTouchPoints;
  if( ctx.touch ){
    $('body').addClass('touch');
  }

  // optionally disable sounds entirely
  ctx.silent = ctx.silent || ctx.query.silent;

  // no need to show sound button when silent
  if( ctx.silent ){
    $('.sound').hide();
  }

  stateHack();
  socialPopup();

  $('#footer [target=_blank]').on('click', function(){
    _gaq.push(['_trackEvent', 'outbound links', $(this).attr('href')]);
  })
  $('header h1 img').addClass('delay');

  // check for inputs
  inputs.on('error',function(err){
    console.error(err.stack)
    info(ctx);
    switch(err.code){
      case 1301: // hash codes does not match
      case 1302: // cannot pass the first frame in queue (dequeue)
      case 1303: // received an input too early (enqueue)
      case 1304: // dropped packets
        throw err; // so we can debug
        break;
      default:
        throw new Error('invalid input error code: '+err.code)
    }
  })

  // networking
  setupNetwork(ctx);

  // key bindings
  setupBindings(ctx);

  // init localization
  localize(ctx.acceptLanguage)

  // toggle debug info
  info(ctx,ctx.dev || ctx.query.dev)
}

Setup.leave = function(){
  throw new Error('this should never happen...')
}



function localize(acceptLanguage){
  localization.init(acceptLanguage);
  localization.on('load', function() {
    var langs = localization.availLanguages();
    if (langs.length < 2) { // only EN
      $('#localizationSwitch').closest('li').hide();
    } else {
      $('#localizationSwitch').html(langs.join('/')).click(function(e) {
        e.preventDefault();
        localization.nextLanguage();
        return false;
      });
    }
  });
}

function stateHack(){
  $('.state.inactive').hide().css('visibility', 'visible')
  //Hack to putting out the state-layers after transitions to prevent recalculation
  $(".state .animate").add($('.state.animate')).each(function(){
    cssEvent(this).on('end',afterTransition)
  })
  function afterTransition(evt){
    var stateElem = $(evt.target).hasClass('state') ? $(evt.target) : $(evt.target).closest('.state');
    if( !stateElem.hasClass('active') )
      stateElem.hide();
  }
}

function socialPopup(){

  $('.social a').on('mouseover', function(){
    dmaf.tell("share_over");
  })

  $('.social a').on('click', function(){
    dmaf.tell("share_click");
    alert('Please do not spread this link.');
    return false;
    var href = $(this).attr('href');
    _gaq.push(['_trackEvent', 'share', href]);
    window.open(href, 'Cube Slam', 'toolbar=0,status=0,width=626,height=480')
    return false;
  })
}

function setupNetwork(ctx){
  ctx.network = new Network(ctx)

  if( !ctx.mobile && ctx.network.available ){
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
      var quality = latency > 150 ? 'bad'
                  : latency > 50 ? 'ok'
                  : 'good';
      $('#latencyMeter').text(latency+'ms').removeClass('ok good bad').addClass(quality)

      _gaq.push(['_trackEvent', '2p', 'latency',undefined,parseInt(latency)]);
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
    })

    // a little counter so we can break after a certain amount
    // or errors.
    var messageTooLong = 0;
    ctx.network.on('error', function(e){
      console.error(e.stack)

      var eventAction = "Generic connection error";

      switch(e.code){
        case 1168: // message too long (1168 = max length)
          eventAction = "Message too long"
          if( ++messageTooLong < 10 ){
            // ignoring the error 10 times
            return
          }
          // reset for after a reconnect
          messageTooLong = 0;
        case 408:  // connection timed out
          eventAction = "Connection timeout"
        default:   // generic connection error
          ctx.network.close()
          // abort unless loading
          if( ctx.pathname != '/loading' ){
            see.abort();
          }

          _gaq.push(['_trackEvent', 'error', eventAction]);

          see('/error/connection');

      }
    })

    ctx.network.on('connected',function(){
      if( ctx.pathname != '/loading' )
        see.abort()
      if(this.winner){
        see('/friend/arrived');
      } else {
        see('/friend/waiting');
      }
    })
    ctx.network.on('disconnected', function(){
      if( ctx.pathname != '/loading' )
        see.abort()
      see('/friend/left')

      // make sure we reactivate the webcam
      ctx.webcam = false;
    })
  }
}

function setupBindings(ctx){
  dmaf.log = ctx.query.dmaf;

  // input bindings
  keys.bind('o',function(){ $("#settingsGUIContainer, #debug-info").toggle() })
  keys.bind('e',function(){ ctx.renderer.triggerEvent('explode') })
  keys.bind('h',function(){ ctx.renderer.triggerEvent('heal') })
  keys.bind('l',function(){ see('/main-menu') })
  keys.bind('m',function(){
    settings.data.debugMirror = !settings.data.debugMirror
    ctx.renderer.triggerEvent('mirrorEffect',{active:settings.data.debugMirror})
  })
  keys.bind('c',function(){
    ctx.renderer.triggerEvent('trace-camera')
  })
  keys.bind('1',function(){
    settings.data.cameraType = 1;
    settings.emit("cameraTypeChanged")
  })

  var r2d = new Renderer2D(document.getElementById('canv-2d'))
    , rXd;
  keys.bind('0',function(){
    // toggle between the 2d renderer and the current one
    if( ctx.renderer.impl !== r2d ){
      rXd = ctx.renderer.impl;
      ctx.renderer.set(r2d)
    } else if( rXd ){
      ctx.renderer.set(rXd);
    }
  })
}
