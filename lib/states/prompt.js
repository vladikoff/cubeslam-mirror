var debug = require('debug')('states:prompt')
  , see = require('../support/see')
  , $ = require('jquery');

var Prompt = exports;

Prompt.enter = function(ctx){

}
Prompt.leave = function(ctx){
}

exports.Level = {
  //Needs to change delay / and animation since we only need
  //css transition
  enter: function(ctx){
    setTimeout( function(){
      see('/game/prompt/round')
    }, 1200)
    //length 1300
  },
  leave: function(ctx){
    ctx.el.hide()
      .siblings('.game-round').data('levelUp', true);
  }
}

exports.Round = {
  //Needs to change delay / and animation since we only need
  //css transition
  enter: function(ctx){
    setTimeout( function(){
      see('/game/prompt/start')
    }, 1200)
  },
  leave: function(ctx){
    ctx.el.hide();
  }
}

exports.Start = {
  enter: function(ctx){
    setTimeout( function(){
      var path = ctx.afterStart;
      ctx.afterStart = null;
      console.log(path);
      see(path||'/game/start')
    }, 1200)
  },
  leave: function(ctx){

  }
}