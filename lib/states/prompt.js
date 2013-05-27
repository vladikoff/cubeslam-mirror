var debug = require('debug')('states:prompt')
  , see = require('../support/see')
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
    var players = ctx.sync ? ctx.sync.world.players : ctx.game.world.players;
    var round = players.a.score + players.b.score + 1;
    $('#round-prompt span').html(round);
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

    $(ctx.el).closest('section').addClass('alternate')
    see(path||'/game/start')
  },
  leave: function(ctx,next){
    $(ctx.el).closest('section').removeClass('alternate')
    this.timeout = setTimeout(next,BEAT)
  },
  cleanup: function(ctx){
    clearTimeout(this.timeout)
  }
}

exports.Over = {
  enter: function(ctx){
    dmaf.tell('gameover_screen');
    if(!ctx.multiplayer){
      $('.win', $(ctx.el)).hide();
      $('.loose', $(ctx.el)).hide();
      $('.over', $(ctx.el)).show()
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