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

  var friend = $('header.main-menu .play-friend')
    , comp = $('header.main-menu .play-computer');
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
  }).prop('disabled',!ctx.network.available)

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
  ctx.network.off('change multiplayer')
  $('header.main-menu .play-friend').off('click')
  $('header.main-menu .play-computer').off('click')
  inputs.unbind('space')
}