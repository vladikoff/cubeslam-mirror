console.profile('load')
console.time('load')

var debug = require('debug').enable('')
  , see = require('./support/see')
  , states = require('./states')
  , $ = require('jquery');

see('/',states.Mobile)
see('/',states.Setup) // game / network / audio / localization
see('/loading',states.Loading)
see('/main-menu',states.MainMenu)
see('/friend/invite',states.Friend.Invite)
see('/friend/waiting',states.Friend.Waiting)
see('/friend/accept',states.Friend.Accept)
see('/friend/arrived',states.Friend.Arrived)
see('/friend/left',states.Friend.Left)
see('/webcam/activate',states.Webcam.Activation)
see('/webcam/information',states.Webcam.Information)
see('/webcam/waiting',states.Webcam.Waiting) // (for friend to pick camera)
see('/game',states.Game.Setup) // Editor / Puppeteer / AI / mouse & keyboard controls
see('/game/info',states.Game.Information)
see('/game/wait',states.Game.Waiting) // (for friend to start game)
see('/game/start',states.Game.Start)  // setup game / create puck / create paddles / create shields
see('/game/play',states.Game.Play)    // unpause game
see('/game/next',states.Game.Next)    // update progress / distort screen / decide if game is really over
see('/game/pause',states.Game.Pause)  // show pause screen
see('/game/round',states.Game.Round)  // show pause screen
see('/game/level',states.Game.Level)  // show pause screen
// see('/game/invite',states.Friend.Invite) // show pause screen
see('/game/over',states.Game.Over)    // show winner!

see.on('enter',function(ctx,state){
  var name = slug(ctx.pathname)||'setup'
  $('body').addClass(name);
  $('.state.' + name).show().addClass('active');
  setTimeout( function(){
    $('.state.' + name).removeClass('inactive');
  },4);
  ctx.el = $('.state.' + name);
  switch(ctx.pathname) {
    case '/main-menu':
    case '/game/info':
    case '/game/pause':
    case '/game/play':
    case '/friend/invite':
      history.pushState({name: ctx.pathname}, name);
      console.log( 'pushstate: ', ctx.pathname )
      break;
  }

})

see.on('leave',function(ctx,state){
  var name = slug(ctx.pathname)||'setup'
  $('body').removeClass(name);
  $('.state.' + name).removeClass('active').addClass('inactive');
  ctx.el = $('.state.' + name);
})

function slug(str){
  return str.replace(/^\//,'').replace(/[\/ ]/g,'-');
}

window.onpopstate = function(evt) {
  if( evt.state != null)
    see(evt.state.name);
}

module.exports = function(ctx){
  see.ctx(ctx)
  see('/loading') // GO!
}