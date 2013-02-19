var debug = require('debug')('states:setup')
  , cookie = require('cookie')
  , inputs = require('mousetrap')
  , Game = require('../game')
  , Renderer = require('../renderer-debug')
  , Themes = require('../renderer-3d/themes')
  , Network = require('../network')
  , settings = require('../settings')
  , localization = require('../localization')
  //, audio = require('../audio')
  , see = require('../support/see')
  , tick = require('../support/tick')
  , selectRange = require('../support/select-text')
  , cssEvent = require('css-emitter')
  , levels = require('../levels')
  , $ = require('jquery');


var Setup = exports;


Setup.enter = function(ctx){
  $("#pointer-lock").bind("click", function(){
    var el = $(this);
    el.toggleClass("enabled");
    if( el.hasClass("enabled") ) {
      el.html("Mouse lock off");
      settings.data.pointerLock = true;
    } else {
      el.html("Mouse lock on");
      settings.data.pointerLock = false;
    }
  })

  ctx.renderer = new Renderer(document.getElementById('canv-3d'),ctx.mobile)
  ctx.game = new Game('game',ctx.renderer);
  // ctx.game.pause()

  // add a frame based setTimeout/setInterval
  ctx.game.on('update',tick.update.bind(tick))

  if( ctx.mobile ){
    ctx.renderer.triggerEvent('css')
  }

  // manually update
  inputs.bind('.',function(){
    ctx.game.update();
    ctx.game.emit('render',ctx.game.world,0)
  })

  ctx.network = new Network(ctx)
  if( !ctx.mobile && ctx.network.available ){
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
    ctx.network.on('full', function(){
      $('body').addClass('error full')
    })
    ctx.network.on('error', function(){
      $('.notification.connection.error').show();
    })

    ctx.network.on('connected',function(pathname){
      if(this.winner)
        see('/friend/accept');
      else
        see('/friend/waiting');
    })
    ctx.network.on('disconnected', function(){
      see('/friend/left')
    })
  }

  $('#scores li').on('click', function(){
    $(this).toggleClass('active')
  })

  //konami code
  inputs.bind('up up down down left right left right b a enter', function() {
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
      cpuBackdropColor :  0x0e0e0d,
      gridBrightness : 0.2
      
    })
  });

  //theme shortcuts
  for (var i = Themes.list.length - 1; i >= 0; i--) {
    if( i <= 9) {
      inputs.bind('ctrl+' + i,function( key ){ Themes.goto(key); return false }.bind(this,i))
    }
  };


  // input bindings
  inputs.bind('o',function(){ $("#settingsGUIContainer").toggle() })
  inputs.bind('8',function(){ ctx.renderer.triggerEvent('2d') })
  inputs.bind('9',function(){ ctx.renderer.triggerEvent('3d') })
  inputs.bind('0',function(){ ctx.renderer.triggerEvent('2d+3d') })
  inputs.bind('e',function(){ ctx.renderer.triggerEvent('explode') })
  inputs.bind('h',function(){ ctx.renderer.triggerEvent('heal') })
  inputs.bind('q',function(){ see('/game/over') })
  inputs.bind('f',function(){ settings.data.debugFireball = !settings.data.debugFireball })
  inputs.bind('g',function(){ settings.data.debugGhostball = !settings.data.debugGhostball })
  inputs.bind('b',function(){ settings.data.debugTimebomb = !settings.data.debugTimebomb })
  inputs.bind('z',function(){ settings.data.debugDeathball = !settings.data.debugDeathball })
  inputs.bind('m',function(){
    settings.data.debugMirror = !settings.data.debugMirror
    ctx.renderer.triggerEvent('mirrorEffect',{active:settings.data.debugMirror})
  })
  inputs.bind('1',function(){
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

  localization.init(ctx.acceptLanguage);
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
/*
  var soundList = [
    { id:"hit", url:"audio/hit2.wav", pitch:"random",loop:false,volume:1}
    , { id:"hit2", url:"audio/hit3.wav", pitch:"random",loop:false,volume:1}
    , { id:"miss", url:"audio/miss.wav", pitch:"",loop:false,volume:1}
    //, { id:"soundtrack", url:"audio/soundtrack.mp3",pitch:"",loop:true,volume:0.5}
  ]
  audio.init(soundList);*/

  // Sound setting is stored in a cookie:
  $('.sound-switch').on('click',function() {
    if ($(this).hasClass('on')) {
      cookie('sound', 'off');
      $(this).removeClass('on').addClass('off');
      if( settings.data.music )
      //  audio.stop("soundtrack");
      settings.data.sounds = false;
    } else {
      cookie('sound', 'on');
      $(this).removeClass('off').addClass('on');
      if( settings.data.music )
        //audio.play("soundtrack");
      settings.data.sounds = true;
    }
    return false;
  });

  if (cookie('sound') == 'off') {
    $('.sound-switch').removeClass('on').addClass('off');
    settings.data.sounds = false;
  } else {
    if( settings.data.music )
      //audio.play("soundtrack");
    settings.data.sounds = true;
  }

  $(".notimplemented").on('click',function(){
    alert('Not implemented yet.');
    return false;
  }).css('cursor', 'pointer');

  $('.share-url .url').each(function() {
    if ($(this).is('input'))
      $(this).val(document.location.href);
    else
      $(this).html(document.location.href);
    $(this).parent().on('click focus', function(){
      $(this).addClass('selected');
      selectRange($(this)[0])
    })
  })

  $('.social a').on('click', function(){
    window.open($(this).attr('href'), "Share", "toolbar=0,status=0,width=626,height=480")
    return false;
  })

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

Setup.leave = function(){
  throw new Error('this should never happen...')
}

