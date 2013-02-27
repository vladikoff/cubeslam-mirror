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
  }
}

exports.Round = {
  enter: function(ctx){
    $("#round-prompt h3 span").html(ctx.game.world.opponent.score + ctx.game.world.me.score + 1);
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
      see(path||'/game/start')
    }, 952.38)
  },
  leave: function(ctx){
  }
}

exports.Over = {
  enter: function(ctx){
    if(!ctx.multiplayer)
      $('.over', $(ctx.el)).show().siblings().hide();
    // if(!ctx.multiplayer)
    //   $('.over', $(ctx.el)).show().siblings().hide();
    setTimeout( function(){
      see('/game/over');
    }, 952.38*3)
  },
  leave: function(ctx){
  }
}