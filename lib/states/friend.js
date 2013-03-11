var debug = require('debug')('states:game')
  , see = require('../support/see')
  , inputs = require('mousetrap')
  , selectRange = require('../support/select-text')
  , $ = require('jquery');

function mainmenu(){ see('/main-menu') }
function webcam(ctx){
  ctx.webcam ? see('/webcam/waiting') : see('/webcam/activate')
}

exports.Invite = {
  enter: function(ctx){
    dmaf.tell('gameover_share');
    $('.return-mainmenu',ctx.el).on('click',mainmenu)
    inputs.bind('space',mainmenu)
    selectRange($('.share-url')[0])
    // TODO select when field is clicked?
  },
  leave: function(ctx){
    $('.return-mainmenu',ctx.el).off('click')
    inputs.unbind('space')
  }
}


exports.Accept = {
  enter: function(ctx){
    this.waitingFor = waitFor(ctx, '/friend/accept', webcam)
    $('.return-mainmenu',ctx.el).on('click',mainmenu)
    inputs.bind('space',mainmenu)
  },
  leave: function(ctx){
    this.waitingFor && ctx.network.off('change pathname', this.waitingFor)
    $('.return-mainmenu',ctx.el).off('click')
    inputs.unbind('space')
  }
}


exports.Arrived = {
  enter: function(ctx){
    $('.play-friend',ctx.el).on('click',function(){ inputs.trigger('space') })
    inputs.bind('space',function(){ see('/friend/accept') })
    if( ctx.query.autonav ){
      this.timeout = setTimeout(function(){
        inputs.trigger('space')
      },1000)
    }
  },
  leave: function(ctx){
    $('.play-friend',ctx.el).off('click')
    inputs.unbind('space')
  }
}

exports.Waiting = {
  enter: function(ctx){
    $('.play-friend',ctx.el).on('click',function(){ inputs.trigger('space') })
    inputs.bind('space',function(){ see('/friend/accept') })
    // while testing click the button automatically
    if( ctx.query.autonav ){
      this.timeout = setTimeout(function(){
        inputs.trigger('space')
      },1000)
    }
  },
  cleanup: function(ctx){
    // this.waitingFor && ctx.network.off('change pathname', this.waitingFor)
    $('.play-friend',ctx.el).off('click')
    inputs.unbind('space')
    clearTimeout(this.timeout)
  }
}


exports.Left = {
  enter: function(ctx){
    var btn = $('.main-menu',ctx.el).on('click',mainmenu)
    inputs.bind('space',mainmenu)
  },
  leave: function(ctx){
    $('.main-menu',ctx.el).off('click')
    inputs.unbind('space')
  }
}

function waitFor(ctx,path,then){
  debug('  waiting for %s -> %s',path,then)
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