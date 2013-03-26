var debug = require('debug')('states:setup')
  , keys = require('mousetrap')
  , Game = require('../game')
  , Renderer = require('../renderer')
  , Themes = require('../themes')
  , Network = require('../network')
  , settings = require('../settings')
  , localization = require('../localization')
  , see = require('../support/see')
  , info = require('../support/info')
  , selectRange = require('../support/select-text')
  , cssEvent = require('css-emitter')
  , inputs = require('../inp')
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

  // check for inputs
  inputs.context(ctx);
  inputs.on('error',function(err){
    console.error(err.stack)
    info(ctx);
    switch(err.code){
      case 1301: // hash codes does not match
      case 1302: // cannot pass the first frame in queue (dequeue)
      case 1303: // received an input too early (enqueue)
      case 1304: // dropped packets
        // determinism is out of the window. pause the inputs.
        inputs.pause(true);
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
  $('.social a').on('click', function(){
    var href = $(this).attr('href');
    _gaq.push(['_trackEvent', 'share', href]);
    window.open(href, 'Share', 'toolbar=0,status=0,width=626,height=480')
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
    ctx.network.on('change latency',inputs.latency)

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

      var eventAction="Generic connection error";

      switch(e.code){
        case 1168: // message too long (1168 = max length)
          eventAction = "Message too long"
          if( ++messageTooLong < 10 ){
            // ignoring the error 10 times
            return
          }
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
    })
  }
}

function setupBindings(ctx){

  // // theme shortcuts
  // for (var i = Themes.list.length - 1; i >= 0; i--) {
  //   //if( i <= 9) {
  //   var modifier = ( i<10 )? "ctrl":"alt";
  //   var key = ( i<10 )? i:i-9;
  //   keys.bind(modifier + '+' + key,function( key ){ Themes.goto(key); return false }.bind(this,i))

  // };


  // input bindings
  keys.bind('o',function(){ $("#settingsGUIContainer").toggle() })
  keys.bind('8',function(){ ctx.renderer.triggerEvent('2d') })
  keys.bind('9',function(){ ctx.renderer.triggerEvent('3d') })
  keys.bind('0',function(){ ctx.renderer.triggerEvent('2d+3d') })
  keys.bind('e',function(){ ctx.renderer.triggerEvent('explode') })
  keys.bind('h',function(){ ctx.renderer.triggerEvent('heal') })
  keys.bind('l',function(){ see('/main-menu') })
  keys.bind('b',function(){ settings.addPuck() })
  keys.bind('q',function(){ see('/game/over') })
  keys.bind('m',function(){
    settings.data.debugMirror = !settings.data.debugMirror
    ctx.renderer.triggerEvent('mirrorEffect',{active:settings.data.debugMirror})
  })
  keys.bind('c',function(){
    if( settings.data.fpsCamera)
      ctx.renderer.triggerEvent('trace-camera')
  })
  keys.bind('1',function(){
    settings.data.fpsCamera = !settings.data.fpsCamera;
    $(".state").css("opacity",0)
    if( settings.data.fpsCamera ) {
      console.log("fps camera on")
      $("#fpsCameraCapture").show().css("z-index",100);
    }
    else {
      console.log("fps camera off")
      $("#fpsCameraCapture").hide().css("z-index",1);
    }
  })
}
