var debug = require('debug')('states:prompt')
  , see = require('../support/see')
  , Themes = require('../themes')
  , $ = require('jquery')
  , dmaf = require('../dmaf.min');

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
    $('.state.game-prompt').find('.background').css('background','' + Themes.current.countdown1);
  },
  leave: function(ctx,next){
    this.timeout = setTimeout(next,BEAT)
  },
  cleanup: function(ctx){
    clearTimeout(this.timeout)
  }
}

exports.Round = {
  enter: function(ctx){
    var round = ctx.game.world.opponent.score + ctx.game.world.me.score + 1;
    $('#round-prompt h3 span').html(round);

    $('.state.game-prompt').find('.background').css('background',Themes.current.countdown1);
    see('/game/prompt/start')
  },
  leave: function(ctx,next){
    this.timeout = setTimeout(next,BEAT)
  },
  cleanup: function(ctx){
    clearTimeout(this.timeout)
  }
}

exports.Start = {
  enter: function(ctx){
    var path = ctx.afterStart;
    ctx.afterStart = null;

    $(".state.game-prompt").find(".background").css("background", Themes.current.countdown2);
    see(path||'/game/start')
  },
  leave: function(ctx,next){
    this.timeout = setTimeout(next,BEAT)
  },
  cleanup: function(ctx){
    clearTimeout(this.timeout)
  }
}

exports.Over = {
  enter: function(ctx){
    dmaf.tell('gameover_screen');
    $('.state.game-prompt').find('.background').css("background", Themes.current.countdown1);
    if(!ctx.multiplayer){
      $('.over', $(ctx.el)).show().siblings().hide();
    }
    see('/game/over');
  },
  leave: function(ctx,next){
    this.timeout = setTimeout(next,BEAT*3)
  },
  cleanup: function(ctx){
    clearTimeout(this.timeout)
  }
}