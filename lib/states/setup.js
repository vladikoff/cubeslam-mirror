var debug = require('debug')('states:setup')
  , cookie = require('cookie')
  , inputs = require('mousetrap')
  , World = require('../world')
  , Game = require('../game')
  , Renderer = require('../renderer-debug')
  , Network = require('../network')
  , settings = require('../settings')
  , localization = require('../localization')
  , actions = require('../actions/all')
  , audio = require('../audio')
  , see = require('../support/see')
  , buffer = require('../support/buffer')
  , Writer = buffer.Writer
  , Reader = buffer.Reader
  , $ = require('jquery');


var Setup = exports;

var BUFFER_SIZES = {};
BUFFER_SIZES[World.MOVE] = 5;
BUFFER_SIZES[World.SHOOT] = 1;
BUFFER_SIZES[World.PAUSE] = 1;
BUFFER_SIZES[World.PLAY] = 1;
BUFFER_SIZES[World.OVER] = 1;

Setup.enter = function enterSetupSync(ctx){
  var r = new Renderer(document.getElementById('canv-2d'))
  var g = new Game(r);
  g.actions.register(actions);

  // network update ctx.multiplayer when (dis)connected
  // and keep updating ctx.latency and ctx.network.pathname
  var n = new Network(ctx)
  var inputBuffer = [], len = 0;
  see.on('enter',function(ctx,state){
    n.emit('state',ctx.pathname)
  })
  g.on('input',function(type,x){
    len += BUFFER_SIZES[type];
    switch(type){
      case World.MOVE:
        // console.log('adding move input to network',x)
        inputBuffer.push(type,x);
        break;
      case World.SHOOT:
      case World.PAUSE:
      case World.PLAY:
      case World.OVER:
        // console.log('adding input to network',type)
        inputBuffer.push(type);
        break;
      default:
        console.error('invalid input')
    }
  })
  g.on('update',function(world){
    if( !len ) return;
    var buf = new ArrayBuffer(2+len);
    var data = new Writer(buf);
    data.setUint16(world.frame);
    for (var i = 0; i < inputBuffer.length;) {
      var type = inputBuffer[i++];
      data.setInt8(type);
      switch(type){
        case World.MOVE:
          data.setFloat32(inputBuffer[i++]);
          break;
        case World.SHOOT:
        case World.PAUSE:
        case World.PLAY:
        case World.OVER:
          break;
        default:
          console.log('unknown type',type)
          return null;
      }
    }
    n.send(buf);
    inputBuffer.length = len = 0
  })
  n.on('message',function(buf){
    var data = new Reader(buf);
    var frame = data.getUint16()
    // TODO update the networkGame until it's
    //      `world.frame == frame` then apply
    //      append the inputs below (and any
    //      inputs from ctx.game)
    while(data.offset < buf.byteLength){
      var type = data.getInt8();
      switch(type){
        case World.MOVE:
          var x = data.getFloat32();
          console.log('%s move',frame,x)
          break;
        case World.SHOOT:
          console.log('%s shoot',frame)
          break;
        case World.PAUSE:
          console.log('%s pause',frame)
          break;
        case World.PLAY:
          console.log('%s play',frame)
          break;
        case World.OVER:
          console.log('%s over',frame)
          break;
        default:
          console.error('invalid input')
          return false;
      }
    }
  })

  ctx.actions = g.actions;
  ctx.renderer = r;
  ctx.game = g;
  ctx.network = n;

  // add remote camera
  n.on('addstream',function(e){
    var remoteVideo = document.getElementById('remoteInput');
    remoteVideo.src = webkitURL.createObjectURL(e.stream);
    ctx.renderer.triggerEvent('remoteVideoAvailable', {visible:true});
  })
  n.on('removestream',function(e){
    ctx.renderer.triggerEvent('remoteVideoAvailable', {visible:false});
    document.getElementById('remoteInput').src = '';
  })


  // multiplayer simulation (no renderer)
  n.on('change multiplayer',function(multiplayer){
    ctx.networkGame = new Game();
  })

  // input bindings
  inputs.bind('o',function(){ $("#settingsGUIContainer").toggle() })
  inputs.bind('8',function(){ r.triggerEvent('2d') })
  inputs.bind('9',function(){ r.triggerEvent('3d') })
  inputs.bind('0',function(){ r.triggerEvent('2d+3d') })

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
  $('.soundSwitch').on('click',function() {
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

  $(".notimplemented").on('click',function(){
    alert('Not implemented yet.');
    return false;
  }).css('cursor', 'pointer');

  $('.shareUrl').each(function() {
    if ($(this).is('input'))
      $(this).val(document.location.href);
    else
      $(this).html(document.location.href);
    $("#shareTextArea").on('click',function(e){
      this.focus();
      this.select();
    })
  })
}

Setup.leave = function(){
  console.error('this should never happen...')
}
