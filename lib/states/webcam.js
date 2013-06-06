var see = require('../support/see')
  , $ = require('jquery');

var getUserMedia = navigator.getUserMedia
                || navigator.webkitGetUserMedia
                || navigator.mozGetUserMedia
                || navigator.msGetUserMedia;
if( getUserMedia ){
  getUserMedia = getUserMedia.bind(navigator);
}

exports.Activation = {
  enter: function(ctx){
    ctx.renderer.changeView('webcamActivation')
    $('#settingsGUIContainer').css('opacity',0);

    if( ctx.webcam ){
      console.log('already have webcam. skipping getUserMedia.')
      return see('/webcam/waiting');
    }

    var constraints = {
      video: {
        mandatory: {
          maxWidth: 320,
          maxHeight: 240,
          minFrameRate: 10
        }
      },
      audio: !ctx.dev
    }

    getUserMedia(constraints,success,error)

    function success(stream){
      var videoInput = document.getElementById('localInput');
      videoInput.width = 320
      videoInput.height = 240
      videoInput.videoWidth = 320
      videoInput.videoHeight = 240
      videoInput.autoplay = true
      videoInput.src = window.webkitURL ? window.webkitURL.createObjectURL(stream) : stream
      ctx.renderer.triggerEvent('localVideoAvailable');
      ctx.webcam = true;

      ctx.network.remote.addStream(stream)
      see('/webcam/waiting')
    }

    function error(){
      ctx.webcam = false;
      see('/webcam/information');
    }
  },
  leave: function(ctx){
    $('#settingsGUIContainer').css('opacity',1);
  }
}


exports.Information = {
  enter: function(ctx){
    $('#activate-camera').on('click',function(){
      see('/webcam/activate')
    })
    $('.keyboard',ctx.el).on('click',function(){
      see('/game/start')
    })
  },
  leave: function(ctx){
    $('#activate-camera').off('click')
    $('.keyboard',ctx.el).off('click')
  }
}


exports.Waiting = {
  enter: function(ctx){
    function waitFor(){
      return ctx.network.pathname == '/webcam/waiting'
          || ctx.network.pathname.indexOf('/game/') === 0;
    }
    if( waitFor() ){
      see('/game/instructions')
    } else {
      this.pathchange = function(pathname){
        if( waitFor() ){
          see('/game/instructions')
        }
      }
      ctx.network.on('change pathname',this.pathchange)
    }
  },
  leave: function(ctx,next){
    this.pathchange && ctx.network.off('change pathname', this.pathchange)

    // wait until ready before leaving
    if( ctx.network.ready ){
      next()
    } else {
      ctx.network.once('ready',function(){
        next()
      })
    }
  },
  cleanup: function(ctx){
    ctx.network.off('ready')
  }
}

