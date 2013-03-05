var camera = require('../camera')
  , see = require('../support/see')
  , $ = require('jquery');

exports.Activation = {
  enter: function(ctx){

    ctx.renderer.activePlayer( ctx.network.winner?1:0, false, true)
    ctx.renderer.changeView('webcamActivation')

    this.success = function(stream){
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

    this.error = function(){
      ctx.webcam = false;
      see('/webcam/information')
    }

    if( !ctx.webcam ){
      camera.on('userMedia',this.success)
      camera.on('userMediaError',this.error)
      camera.start()
    } else {
      see('/webcam/waiting')
    }
  },
  leave: function(ctx){
    camera.off('userMedia',this.success)
    camera.off('userMediaError',this.error)
    camera.hide()
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
      if( pathname == '/webcam/waiting')
        see('/game/instructions')
    }
    ctx.network.on('change pathname',this.pathchange)
    if( ctx.network.pathname == '/webcam/waiting')
      see('/game/instructions')
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
  }
}

