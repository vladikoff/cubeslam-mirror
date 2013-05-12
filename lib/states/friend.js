var debug = require('debug')('states:game')
  , see = require('../support/see')
  , inputs = require('mousetrap')
  , selectRange = require('../support/select-text')
  , $ = require('jquery')
  , dmaf = require('../dmaf.min');

function mainmenu(){ see('/main-menu') }
function webcam(ctx){ see('/webcam/activate') }

exports.Invite = {
  enter: function(ctx){
    dmaf.tell('friend_screen');
    $('.return-mainmenu',ctx.el).on('click',mainmenu)
    inputs.bind('space',mainmenu)
    $('span.url', ctx.el).text(window.location.href)
    selectRange($('.share-url')[0])
  },
  leave: function(ctx){
    dmaf.tell('friend_screen_out');
    $('.return-mainmenu',ctx.el).off('click')
    inputs.unbind('space')
  }
}


exports.Accept = {
  enter: function(ctx){
    dmaf.tell('friend_accept')
    this.waitingFor = waitFor(ctx, '/friend/accept', webcam)
  },
  leave: function(ctx){
    dmaf.tell('friend_accept_out')
    this.waitingFor && ctx.network.off('change pathname', this.waitingFor)
  }
}


exports.Arrived = {
  enter: function(ctx){
    dmaf.tell('friend_arrived');
    $('.play-friend',ctx.el).on('click',function(){ inputs.trigger('space') })
    inputs.bind('space',function(){ see('/friend/accept') })
    if( ctx.query.autonav ){
      this.timeout = setTimeout(function(){
        inputs.trigger('space')
      },1000)
    }
  },
  leave: function(ctx){
    dmaf.tell('friend_arrived_out');
    $('.play-friend',ctx.el).off('click')
    inputs.unbind('space')
  }
}

exports.Waiting = {
  enter: function(ctx){
    dmaf.tell('friend_waiting')
    $('.play-friend',ctx.el).on('click',function(){ inputs.trigger('space') })
    inputs.bind('space',function(){ see('/friend/accept') })
    // while testing click the button automatically
    if( ctx.query.autonav ){
      this.timeout = setTimeout(function(){
        inputs.trigger('space')
      },1000)
    }
  },
  leave: function(ctx){
    dmaf.tell('friend_waiting_out')
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
    dmaf.tell('friend_left')
    var btn = $('.main-menu',ctx.el).on('click',mainmenu)
    inputs.bind('space',mainmenu)
  },
  leave: function(ctx){
    dmaf.tell('friend_left_out')
    $('.main-menu',ctx.el).off('click')
    inputs.unbind('space')
  }
}

function waitFor(ctx,path,then){
  debug('  waiting for %s -> %s',path,then)
  var next = null;
  if( ctx.network.pathname && ctx.network.pathname.indexOf(path) === 0 ){
    then(ctx)
  } else {
    debug('  waiting for pathname change')
    next = function(pathname){
      debug('  network pathname change', pathname)
      if( pathname.indexOf(path) === 0 ){
        ctx.network.off('change pathname',next)
        then(ctx)
      }
    }
    ctx.network.on('change pathname',next)
  }
  return next;
}