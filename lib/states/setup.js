var debug = require('debug')('states:setup')
  , keys = require('mousetrap')
  , Game = require('../game')
  , Renderer = require('../renderer-debug')
  , Themes = require('../renderer-3d/themes')
  , Network = require('../network')
  , settings = require('../settings')
  , localization = require('../localization')
  , see = require('../support/see')
  , selectRange = require('../support/select-text')
  , cssEvent = require('css-emitter')
  , levels = require('../levels')
  , inputs = require('../inp')
  , $ = require('jquery');


var Setup = exports;


Setup.enter = function(ctx){
  ctx.renderer = new Renderer(document.getElementById('canv-2d'),ctx.mobile)
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

  // show css renderer when mobile
  // TODO this should be handled in mobile eventually
  //      but we do this while we use the debug renderer
  if( ctx.mobile ){
    ctx.renderer.triggerEvent('css')
  }

  // check for inputs
  inputs.context(ctx);
  ctx.game.on('update',inputs.update);

  // networking
  setupNetwork(ctx);

  // key bindings
  setupBindings(ctx);

  // init localization
  localize(ctx.acceptLanguage)

  // check for touch
  ctx.touch = 'ontouchstart' in window || navigator.msMaxTouchPoints;
  if( ctx.touch ){
    $('body').addClass('touch');
  }

  // optionally disable sounds entirely
  ctx.silent = ctx.silent || ctx.query.silent || typeof dmaf == 'undefined';
  if( ctx.silent ){
    window.webkitAudioContext = false;

    // shims to avoid errors
    if( typeof dmaf == 'undefined' ){
      dmaf = {
        tell: function(){},
        once: function(evt,fn){fn()}
      }
    }
  }

  // temporary hack...
  $(".notimplemented").on('click',function(){
    alert('Not implemented yet.');
    return false;
  }).css('cursor', 'pointer');

  stateHack();
  socialPopup();
}

Setup.leave = function(){
  throw new Error('this should never happen...')
}



function localize(acceptLanguage){
  localization.init(acceptLanguage);
  localization.on('load', function() {
    var langs = localization.availLanguages();
    if (langs.length < 1) {
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
    window.open($(this).attr('href'), "Share", "toolbar=0,status=0,width=626,height=480")
    return false;
  })
}

function setupNetwork(ctx){
  ctx.network = new Network(ctx)
  if( !ctx.mobile && ctx.network.available ){
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
      $('body').addClass('error full')
    })
    ctx.network.on('error', function(){
      $('.notification.connection.error').show();
    })

    ctx.network.on('connected',function(pathname){
      see.abort()
      if(this.winner)
        see('/friend/accept');
      else
        see('/friend/waiting');
    })
    ctx.network.on('disconnected', function(){
      see.abort()
      see('/friend/left')
    })
  }
}

function setupBindings(ctx){

  //konami code
 /* keys.bind('up up down down left right left right b a enter', function() {
    settings.changeTheme({
      shieldColor :  0xffffff,
      puckColor :  0xff7b17,
      arenaColor :  0xffffff,
      terrainColor1 :  0xff7b17,
      terrainColor2 :  0xff7b17,
      terrainColor3 :  0xff7b17,
      treeTrunkColor :  0xff0018,
      treeBranchColor :  0xff0018,
      iconColor :  0xffffff,
      cpuBackdropColor : 0x0e0e0d,
      gridBrightness : 0.2
    })
  });*/

  // theme shortcuts
  for (var i = Themes.list.length - 1; i >= 0; i--) {
    //if( i <= 9) {
    var modifier = ( i<10 )? "ctrl":"alt";
    var key = ( i<10 )? i:i-9;
    keys.bind(modifier + '+' + key,function( key ){ Themes.goto(key); return false }.bind(this,i))

  };


  // input bindings
  keys.bind('o',function(){ $("#settingsGUIContainer").toggle() })
  keys.bind('8',function(){ ctx.renderer.triggerEvent('2d') })
  keys.bind('9',function(){ ctx.renderer.triggerEvent('3d') })
  keys.bind('0',function(){ ctx.renderer.triggerEvent('2d+3d') })
  keys.bind('e',function(){ ctx.renderer.triggerEvent('explode') })
  keys.bind('h',function(){ ctx.renderer.triggerEvent('heal') })
  keys.bind('l',function(){ see('/main-menu') })
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
