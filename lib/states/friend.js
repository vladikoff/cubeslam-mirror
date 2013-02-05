var see = require('../support/see')
  , inputs = require('mousetrap')
  , $ = require('jquery');

function mainmenu(){ see('/main-menu') }
function webcam(ctx){
  // 2d renderer works best for now
  // ctx.renderer.triggerEvent('2d')
  ctx.webcam ? see('/webcam/waiting') : see('/webcam/activate')
}

exports.Invite = {
  enter: function(ctx){
    ctx.network.on('change pathname',function(pathname){
      if( pathname == '/friend/waiting' )
        see('/friend/accept');
      if( pathname == '/friend/arrived' )
        see('/friend/accept')
      if( pathname == '/friend/invite' )
        see('/friend/arrived')
    })
    if( ctx.network.pathname == '/friend/waiting' )
      see('/friend/accept');
    $('.return-mainmenu',ctx.el).on('click',mainmenu)
    inputs.bind('space',mainmenu)
  },
  leave: function(ctx){
    $('.return-mainmenu',ctx.el).off('click')
    inputs.unbind('space')
  }
}


exports.Accept = {
  enter: function(ctx){
    ctx.network.on('change pathname',function(pathname){
      if( pathname.indexOf('/webcam') == 0 )
        webcam(ctx)
    })
    if( ctx.network.pathname.indexOf('/webcam') == 0 )
      webcam(ctx)

    $('.return-mainmenu',ctx.el).on('click',mainmenu)
    inputs.bind('space',mainmenu)
  },
  leave: function(ctx){
    $('.return-mainmenu',ctx.el).off('click')
    inputs.unbind('space')
  }
}


exports.Waiting = {
  enter: function(ctx){
    $('.play-friend',ctx.el).on('click',function(){ inputs.trigger('space') })
    inputs.bind('space',function(){ webcam(ctx) })
  },
  leave: function(ctx){
    $('.play-friend',ctx.el).off('click')
    inputs.unbind('space')
  }
}


exports.Arrived = {
  enter: function(ctx){
    $('.play-friend',ctx.el).on('click',function(){ inputs.trigger('space') })
    inputs.bind('space',function(){ webcam(ctx) })
  },
  leave: function(ctx){
    $('.play-friend',ctx.el).off('click')
    inputs.unbind('space')
  }
}


exports.Left = {
  enter: function(ctx){
    $('.play-friend',ctx.el).on('click',function(){ see('/game/wait') })
    $('.play',ctx.el).on('click',function(){ see('/game/start') })
    inputs.bind('space',function(){ see('/game/start') })
  },
  leave: function(ctx){
    $('.play-friend',ctx.el).off('click')
    $('.play',ctx.el).off('click')
    inputs.unbind('space')
  }
}