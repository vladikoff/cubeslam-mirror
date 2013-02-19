var debug = require('debug')('states:game')
  , see = require('../support/see')
  , inputs = require('mousetrap')
  , selectRange = require('../support/select-text')
  , $ = require('jquery');

function mainmenu(){ see('/main-menu') }
function gamepause(){ see('/game/pause') }
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

    if(ctx.pathname == '/game/invite') {
      $('.return-mainmenu',ctx.el).on('click',gamepause)
      inputs.bind('space',gamepause)
    } else {
      $('.return-mainmenu',ctx.el).on('click',mainmenu)
      inputs.bind('space',mainmenu)
    }

    selectRange($('.share-url')[0])
  },
  leave: function(ctx){
    $('.return-mainmenu',ctx.el).off('click')
    inputs.unbind('space')
  }
}


exports.Accept = {
  enter: function(ctx){
    this.waitingFor = waitFor(ctx, '/webcam', webcam)
    $('.return-mainmenu',ctx.el).on('click',mainmenu)
    inputs.bind('space',mainmenu)
  },
  leave: function(ctx){
    ctx.network.off('change pathname', this.waitingFor)
    $('.return-mainmenu',ctx.el).off('click')
    inputs.unbind('space')
  }
}


exports.Waiting = {
  enter: function(ctx){
    this.waitingFor = waitFor(ctx, '/webcam', webcam)
    $('.play-friend',ctx.el).on('click',function(){ inputs.trigger('space') })
    inputs.bind('space',function(){ webcam(ctx) })

    // while testing click the button automatically
    this.timeout = setTimeout(function(){
      inputs.trigger('space')
    },1000)
  },
  leave: function(ctx){
    ctx.network.off('change pathname', this.waitingFor)
    $('.play-friend',ctx.el).off('click')
    inputs.unbind('space')
    clearTimeout(this.timeout)
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

function waitFor(ctx,path,then){
  debug('  waiting for %s -> %s',path,then)
  // TODO wait for other player
  if( ctx.network.pathname && ctx.network.pathname.indexOf(path) == 0 ){
    then(ctx)
  } else {
    debug('  waiting for pathname change')
    var next;
    next = function(pathname){
      debug('  network pathname change', pathname)
      if( pathname.indexOf(path) == 0 ){
        ctx.network.off('change pathname',next)
        then(ctx)
      }
    }
    ctx.network.on('change pathname',next)
  }
  return next;
}