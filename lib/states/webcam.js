var camera = require('../camera')
  , see = require('../support/see');

exports.Activation = {
  enter: function(ctx){
    ctx.renderer.changeView('webcamActivation')

    this.success = function(stream){
      ctx.webcam = true;
      var videoInput = document.getElementById('videoInput');
      videoInput.width = 320
      videoInput.height = 240
      videoInput.autoplay = true
      videoInput.src = window.webkitURL ? window.webkitURL.createObjectURL(stream) : stream
      ctx.renderer.triggerEvent('localVideoAvailable');
      see('/webcam/waiting')
    }

    this.error = function(){
      ctx.webcam = false;
      see('/webcam/information')
    }

    camera.on('userMedia',this.success)
    camera.on('userMediaError',this.error)
    camera.start()
  },
  leave: function(ctx){
    camera.off('userMedia',this.success)
    camera.off('userMediaError',this.error)
    camera.hide()
  }
}


exports.Information = {
  enter: function(ctx){
    $('#activateCamera').on('click',function(){
      see('/webcam/activate')
    })
    $('.keyboard',ctx.el).on('click',function(){
      if( ctx.network.pathname.indexOf('/game') == 0 )
        see('/game/start')
      else
        see('/game/information')
    })
  },
  leave: function(ctx){
    $('#activateCamera').off('click')
    $('.keyboard',ctx.el).off('click')
  }
}


exports.Waiting = {
  enter: function(ctx){
    ctx.network.on('change pathname',function(pathname){
      if( pathname == '/webcam/waiting' )
        see('/game/start')
    })
    if( ctx.network.pathname == '/webcam/waiting' )
      see('/game/start')
  },
  leave: function(ctx){
    ctx.network.off('change pathname')
  }
}

