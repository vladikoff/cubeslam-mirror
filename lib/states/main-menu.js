var inputs = require('mousetrap')
  , see = require('../support/see')
  , $ = require('jquery');

var MainMenu = exports;

MainMenu.enter = function enterMainMenuSync(ctx){
  ctx.renderer.changeView("lobby");

  // shortcut
  if( ~window.location.href.indexOf("play") ){
    ctx.renderer.activePlayer(0);
    return see('/game/play');
  }

  var friend = $('#mainmenu .playFriend')
    , comp = $('#mainmenu .playComputer');
  ctx.network.on('change multiplayer',function(multi){
    friend.prop('disabled',!multi)
  })
  friend.prop('disabled',!ctx.multiplayer)
  friend.on('click',function(){
    switch(ctx.network.pathname){
      case '/friend/arrived':
        return see('/friend/accept');
      case '/friend/invite':
      case '/friend/waiting':
        return see('/friend/arrived');
      default:
        return see('/friend/invite');
    }
  });

  // TODO if friend is already waiting go to /friend/waiting
  if( ctx.network.pathname == '/friend/invite' )
    see('/friend/waiting')

  comp.on('click', function(){
    see('/game/info')
  });

  inputs.bind('space',function(){
    $('#mainmenu .playComputer').click()
  })
}

MainMenu.leave = function(ctx){
  console.log('leaving main menu')
  ctx.network.off('change multiplayer')
  $('#mainmenu .playFriend').off('click')
  $('#mainmenu .playComputer').off('click')
  inputs.unbind('space')
}