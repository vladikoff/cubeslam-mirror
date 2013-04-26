var see = require('../support/see')
  , $ = require('jquery');

var getUserMedia = (navigator.getUserMedia
                 || navigator.webkitGetUserMedia
                 || navigator.mozGetUserMedia
                 || navigator.msGetUserMedia).bind(navigator);

exports.Activation = {
  enter: function(ctx){
    ctx.renderer.changeView('webcamActivation')
    $("#settingsGUIContainer").css('opacity',0);

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
      ctx.webcam = true;
      var videoInput = document.getElementById('localInput');
      videoInput.width = 320
      videoInput.height = 240
      videoInput.autoplay = true
      videoInput.src = window.webkitURL ? window.webkitURL.createObjectURL(stream) : stream
      ctx.renderer.triggerEvent('localVideoAvailable');
      ctx.network.remote.addStream(stream)
      see('/webcam/waiting')
    }

    function error(){
      ctx.webcam = false;
      see('/webcam/information');
    }
  },
  leave: function(ctx){
    $("#settingsGUIContainer").css('opacity',1);
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
    this.pathchange = function(pathname){
      if( pathname == '/webcam/waiting'){
        see('/game/instructions')
      }
    }
    ctx.network.on('change pathname',this.pathchange)
    if( ctx.network.pathname == '/webcam/waiting'){
      see('/game/instructions')
    }
  },
  leave: function(ctx,next){
    ctx.network.off('change pathname', this.pathchange)

    // wait until ready before leaving
    if( ctx.network.ready ){
      next()
    } else {
      // TODO cleanup next?
      ctx.network.once('ready',next);
      ctx.network.start()
    }
  },
  cleanup: function(ctx){
    ctx.network.off('ready')
  }
}

