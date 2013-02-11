var inputs = require('mousetrap')
  , see = require('../support/see')
  , $ = require('jquery');

var MainMenu = exports;

MainMenu.enter = function enterMainMenuSync(ctx){
 
  ctx.renderer.changeView("lobby");

  // shortcut
  if( ~window.location.href.indexOf("play") ){
    ctx.renderer.activePlayer(1);
    return see('/game/play');
  }

  var friend = $('.play-friend',ctx.el)
    , comp = $('.play-computer',ctx.el);
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

  ctx.network.on('change pathname',function(pathname){
    if( ctx.network.pathname == '/friend/invite' )
      see('/friend/waiting')
  })
  if( ctx.network.pathname == '/friend/invite' )
    see('/friend/waiting')

  comp.on('click', function(){
    see('/game/info')
  });

  inputs.bind('space',function(){
    comp.click()
  })
}

MainMenu.leave = function(ctx){
  $('.play-friend',ctx.el).off('click')
  $('.play-computer',ctx.el).off('click')
  inputs.unbind('space')
}