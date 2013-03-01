var debug = require('debug')('states:prompt')
  , see = require('../support/see')
  , $ = require('jquery');

var BEAT = 952.38;

var Prompt = exports;

Prompt.enter = function(ctx){

}
Prompt.leave = function(ctx){
}

exports.Level = {
  enter: function(ctx){
    dmaf.tell('countdown_init')
    see('/game/prompt/round')
  },
  leave: function(ctx,next){
    setTimeout(next,BEAT)
  }
}

exports.Round = {
  enter: function(ctx){
    var round = ctx.game.world.opponent.score + ctx.game.world.me.score + 1;
    $("#round-prompt h3 span").html(round);
    see('/game/prompt/start')
  },
  leave: function(ctx,next){
    setTimeout(next,BEAT)
  }
}

exports.Start = {
  enter: function(ctx){
    var path = ctx.afterStart;
    ctx.afterStart = null;
    see(path||'/game/start')
  },
  leave: function(ctx,next){
    setTimeout(next,BEAT)
  }
}

exports.Over = {
  enter: function(ctx){
    
    dmaf.tell('gameover_screen');

    if(!ctx.multiplayer){
      $('.over', $(ctx.el)).show().siblings().hide();
    }
    //see('/game/over');
  },
  leave: function(ctx,next){
    setTimeout(next,BEAT*3)
  }
}