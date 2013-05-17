var see = require('../support/see')
  , inputs = require('mousetrap')
  , $ = require('jquery');

exports.enter = function(){

}

exports.leave = function(){

}

exports.DataChannels = {
  enter: function(ctx){
    var btn = $('.main-menu',ctx.el).on('click', function(e){
      see('/main-menu')
      e.preventDefault()
    })
    inputs.bind('space',function(){
      btn.click();
    })
  },
  leave: function(ctx){
    $('.mainmenu',ctx.el).off('click')
    inputs.unbind('space')
  }
}
exports.ConnectionError = {
  enter: function(ctx){
    inputs.bind('space',function(){
      $('a.button',ctx.el).click();
    })
  },
  leave: function(ctx){
    inputs.unbind('space')
  }
}
exports.FullRoom = {
  enter: function(ctx){
    /*var btn = $('.main-menu',ctx.el).on('click', function(){
      see('/main-menu')
    })*/
    var btn = $('.main-menu',ctx.el);

    inputs.bind('space',function(){
      btn.click();
    })
  },
  leave: function(ctx){
    $('.mainmenu',ctx.el).off('click')
    inputs.unbind('space')
  }
}

exports.Browser = {
  enter: function(ctx){
    var btn = $('.button',ctx.el).on('click', function(){
    })
  },
  leave: function(ctx){
    $('.button',ctx.el).off('click')
  }
}

exports.Lonely = {
  enter: function(ctx){
    var btn = $('.button',ctx.el).on('click', function(){
    })
  },
  leave: function(ctx){
    $('.button',ctx.el).off('click')
  }
}

