var inputs = require('mousetrap')
  , see = require('../support/see')
  , cookie = require('cookie')
  , $ = require('jquery');

var MainMenu = exports;

MainMenu.enter = function(ctx){

  ctx.renderer.changeView("main-menu");

  window.onfocus = function(){
    dmaf.tell('active');
  }

  window.onblur = function(){
    // if( ctx.multiplayer ){
    //   var path = ctx.pathname;
    //   if( ~path.indexOf('/game/') && ~path.indexOf('/game/over') ){
    //     see('/game/pause')
    //   }
    // }
    dmaf.tell('inactive');
  }

  $("#about").find("li").unbind("mousedown").bind("mousedown", function(evt){
    dmaf.tell('text_button_down', {className:evt.currentTarget.className})
  }).unbind("mouseover").bind("mouseover", function(evt){
    dmaf.tell('text_button_over', {className:evt.currentTarget.className})
  })

  $("#socials").find("li").unbind("mousedown").bind("mousedown", function(evt){
    dmaf.tell('small_button_down', {className:evt.currentTarget.className})
  }).unbind("mouseover").bind("mouseover", function(evt){
    dmaf.tell('small_button_over', {className:evt.currentTarget.className})
  })

  $("button").unbind("mousedown").bind("mousedown", function( evt){
    dmaf.tell('button_down', {className:evt.currentTarget.className})
  }).unbind("mouseover").bind("mouseover", function(evt){
    dmaf.tell('button_over',{className:evt.currentTarget.className})
  })


  // check sound setting (stored in a cookie)

  sound(cookie('sound'));
  $('.sound-switch').click(function(){sound()})

  var friend = $('.play-friend',ctx.el)
    , comp = $('.play-computer',ctx.el);
  friend.on('click',function(){
    if(!ctx.network.available)
      return see('/error/datachannels');
    switch(ctx.network.pathname){
      case '/friend/arrived':
        return see('/friend/accept');
      case '/friend/invite':
      case '/friend/waiting':
        return see('/friend/arrived');
      default:
        return see('/friend/invite');
    }
  })
  //.prop('disabled',!ctx.network.available)

  ctx.network.on('change pathname',function(pathname){
    if( ctx.network.pathname == '/friend/invite' )
      see('/friend/waiting')
  })
  if( ctx.network.pathname == '/friend/invite' ){
    see('/friend/waiting')
  }

  comp.on('click', function(){
    see('/game/instructions')
  });

  inputs.bind('space',function(){
    comp.click()
  })

  if( ctx.query.play ){
    see('/game/instructions')
    
  }

}

MainMenu.leave = function(ctx){
  $('.play-friend',ctx.el).off('click')
  $('.play-computer',ctx.el).off('click')
  inputs.unbind('space')
}



// sound('on') / sound('off') / sound()
function sound(toggle){

  var el = $('.sound-switch');

  if( typeof toggle == 'undefined' ){
    toggle = el.hasClass('on') ? 'off' : 'on';
  } else if( toggle == 'on' || toggle == 'off' ){
    toggle = toggle
  } else {
    toggle = toggle ? 'on' : 'off';
  }

  switch(toggle){
    case 'on':
      el.removeClass('off').addClass('on');
      if( dmaf.tell ) dmaf.tell('sound_on');
      cookie('sound', 'on');
      break;

    case 'off':
      el.removeClass('on').addClass('off');
      if( dmaf.tell ) dmaf.tell('sound_off');
      cookie('sound', 'off');
      break;

    default:
      throw new Error('you\'re doing it wrong.');
  }
}
