var debug = require('debug').enable('renderer:css')
  , see = require('./support/see')
  , states = require('./states')
  , $ = require('jquery');

see('/',states.Setup) // game / network / audio / localization
see('/',states.Mobile)
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
see('/game/start',states.Game.Start) // reset game / create puck
see('/game/play',states.Game.Play)
see('/game/pause',states.Game.Pause)
see('/game/over',states.Game.Over)

see.on('enter',function(ctx,state){
  var name = slug(ctx.pathname)||'setup'
  $('body').addClass(name);
  $('.state.' + name).addClass('active').removeClass('inactive');
  ctx.el = $('.state.' + name);
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

module.exports = function(ctx){
  see.ctx(ctx)
  see('/loading') // GO!
}