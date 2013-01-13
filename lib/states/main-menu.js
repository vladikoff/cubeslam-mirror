var inputs = require('mousetrap')
  , see = require('../support/see')
  , $ = require('jquery');

var MainMenu = exports;

MainMenu.enter = function enterMainMenuSync(ctx){
  // start the game (only rendering) in the background
  ctx.game.run()

  // shortcut
  if( ~window.location.href.indexOf("play") ){
    ctx.renderer.activePlayer(0);
    return see('/game/play');
  }

  $('#mainmenu .playFriend').on('click', function(){
    if( !ctx.network ) return console.warn('network not implemented');
    switch(ctx.network.pathname){
      case '/friend/invite':
      case '/friend/arrived':
        return see('/friend/accept');
      case '/friend/waiting':
        return see('/friend/arrived');
      default: // not yet connected (or connected friend is not waiting)
        if( ctx.host )
          return see('/friend/invite');
        else
          return see('/webcam/activate');
    }
  }.bind(this));

  $('#mainmenu .playComputer').on('click', function(){
    see('/game/info')
  }.bind(this));

  ctx.renderer.changeView("lobby");

  inputs.bind('space',function(){
    $('#mainmenu .playComputer').click()
  })
}

MainMenu.leave = function(ctx){
  console.log('leaving main menu')
  $('#mainmenu .playFriend').off('click')
  $('#mainmenu .playComputer').off('click')
  inputs.unbind('space')
}