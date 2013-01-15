var see = require('../support/see')
  , inputs = require('mousetrap')
  , $ = require('jquery');

function mainmenu(){ see('/main-menu') }
function webcam(ctx){ ctx.webcam ? see('/webcam/waiting') : see('/webcam/activate') }

exports.Invite = {
  enter: function(ctx){
    ctx.network.on('change pathname',function(pathname){
      if( pathname == '/friend/arrived' )
        see('/friend/accept')
    })
    if( ctx.network.pathname == '/friend/waiting' )
      see('/friend/accept');
    $('.backToMainMenu',ctx.el).on('click',mainmenu)
    inputs.bind('space',mainmenu)
  },
  leave: function(ctx){
    $('.backToMainMenu',ctx.el).off('click')
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

    $('.backToMainMenu',ctx.el).on('click',mainmenu)
    inputs.bind('space',mainmenu)
  },
  leave: function(ctx){
    $('.backToMainMenu',ctx.el).off('click')
    inputs.unbind('space')
  }
}


exports.Waiting = {
  enter: function(ctx){
    $('#playFriend',ctx.el).on('click',inputs.trigger.bind(inputs,'space',undefined))
    inputs.bind('space',function(){ webcam(ctx) })
  },
  leave: function(ctx){
    $('#playFriend',ctx.el).off('click')
    inputs.unbind('space')
  }
}


exports.Arrived = {
  enter: function(ctx){
    $('#playFriend',ctx.el).on('click',inputs.trigger.bind(inputs,'space',undefined))
    inputs.bind('space',function(){ webcam(ctx) })
  },
  leave: function(ctx){
    $('#playFriend',ctx.el).off('click')
    inputs.unbind('space')
  }
}


exports.Left = {
  enter: function(ctx){},
  leave: function(ctx){}
}