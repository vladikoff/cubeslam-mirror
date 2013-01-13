var debug = require('debug').enable('game see actions:*')
  , see = require('./support/see')
  , states = require('./states')
  , $ = require('jquery');

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
see('/game/play',states.Game.Play)
see('/game/pause',states.Game.Pause)
see('/game/over',states.Game.Over)

see.on('enter',function(ctx,state){
  var name = ctx.pathname.replace(/^\//,'').replace(/[\/ ]/g,'-');
  console.log('entering',ctx.path,name)
  $('body').addClass(name);
  $('.state.' + name).addClass('active').removeClass('inactive');
})

see.on('leave',function(ctx,state){
  var name = ctx.pathname.replace(/^\//,'').replace(/[\/ ]/g,'-');
  console.log('leaving',ctx.path,name)
  $('body').removeClass(name);
  $('.state.' + name).removeClass('active').addClass('inactive');
})

module.exports = function(){
  see('/loading') // GO!
}
