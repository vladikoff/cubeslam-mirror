console.groupCollapsed('load')
console.profile('load')
console.time('load')

var debug = require('debug').enable(d('')) // <-- enable within d()
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
see('/game/instructions',states.Game.Instructions)
see('/game/wait',states.Game.Wait) // (for friend to start game)
see('/game/start',states.Game.Start)  // setup game / create puck / create paddles / create shields
see('/game/play',states.Game.Play)    // unpause game
see('/game/next',states.Game.Next)    // update progress / distort screen / decide if game is really over
see('/game/pause',states.Game.Pause)  // show pause screen
see('/game/over',states.Game.Over)    // show winner!
see('/game/prompt',states.Prompt)  // show round prompt
see('/game/prompt/round',states.Prompt.Round)   // show round prompt
see('/game/prompt/level',states.Prompt.Level)   // show level prompt
see('/game/prompt/start',states.Prompt.Start)   // show level prompt
see('/game/prompt/over',states.Prompt.Over)     // show game over prompt
see('/game/invite',states.Friend.Invite)
see('/game/arrived',states.Friend.Arrived)

// to avoid receiving a popstate on
// reloading we only activate it after receiving the
// initial pushState
var startedHistory = false;

see.on('enter',function(ctx,state){
  var name = slug(ctx.pathname)||'setup'
  $('body').addClass(name);
  $('.state.' + name).show().addClass('active');
  setTimeout(function(){
    $('.state.' + name).removeClass('inactive');
  },4);
  ctx.el = $('.state.' + name);
  switch(ctx.pathname) {
    case '/main-menu':
    case '/game/instructions':
    case '/game/pause':
    case '/game/play':
    case '/friend/invite':
      history.pushState({pathname: ctx.pathname}, name);
      startedHistory = true;
      break;
  }
  switch (ctx.pathname) {
    case '/game/pause': dmaf.tell("pause"); break;
    case '/game/play': dmaf.tell("unpause"); break;
  }
})

see.on('leave',function(ctx,state){
  var name = slug(ctx.pathname)||'setup'
  $('body').removeClass(name);
  var stateElem = $('.state.' + name).removeClass('active').addClass('inactive');
  stateElem.each(function(){
    if(!$(this).hasClass('animate') && $('.animate', $(this)).length < 1) {
      $(this).hide();
    }
  })
  ctx.el = $('.state.' + name);
})

window.onpopstate = function(evt) {
  if( startedHistory && evt.state != null )
    see(evt.state.pathname);
}

module.exports = function main(ctx){
  // add query object to ctx
  ctx.query = qs();
  see.ctx(ctx)
  see('/loading') // GO!
}

function slug(str){
  return str.replace(/^\//,'').replace(/[\/ ]/g,'-');
}

function d(enabled){
  if( enabled )
    return enabled;
  var m = /&?d=([^&]+)/g.exec(location.search);
  if( m ){
    return m[1].replace(/%20|\+/g,' ');
  } else {
    return '';
  }
}

function qs(){
  var obj = {};
  var query = window.location.search.substring(1);
  var vars = query.split('&');
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split('=')
      , key = decodeURIComponent(pair[0])
      , val = decodeURIComponent(pair[1]);
    obj[key] = val || true; // true so "?x"; if( query.x ){}
  }
  return obj;
}