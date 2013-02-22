var debug = require('debug')('states:prompt')
  , see = require('../support/see')
  , $ = require('jquery');

var Prompt = exports;

Prompt.enter = function(ctx){

}
Prompt.leave = function(ctx){
}

exports.Level = {
  enter: function(ctx){

    dmaf.tell('countdown_init')
    setTimeout( function(){
      see('/game/prompt/round')
    }, 952.38)
  },
  leave: function(ctx){
    ctx.el.hide()
      .siblings('.game-round').data('levelUp', true);
  }
}

exports.Round = {
  enter: function(ctx){
    setTimeout( function(){
      see('/game/prompt/start')
    }, 952.38)
  },
  leave: function(ctx){
  }
}

exports.Start = {
  enter: function(ctx){
    setTimeout( function(){
      var path = ctx.afterStart;
      ctx.afterStart = null;
      console.log(path);
      see(path||'/game/start')
    }, 952.38)
  },
  leave: function(ctx){
  }
}