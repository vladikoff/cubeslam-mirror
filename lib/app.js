function noop(){}
if(!window.console) { window.console = {log:noop,warn:noop,error:noop} }
if(!window.console.time) { window.console.time = window.console.timeEnd = noop }
if(!window.console.profile) { window.console.profile = noop }
if(!window.console.group) { window.console.group = window.console.groupEnd = window.console.groupCollapsed = noop }

console.groupCollapsed('load')
console.time('load')

var debug = require('debug').enable(d('')) // <-- enable within d() (prefer using ?d=xyz)
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
see('/game',states.Game.Input)
see('/game',states.Game.Multiplayer)
see('/game',states.Game.Verify)
see('/game',states.Game.Setup)        // Editor / Puppeteer / AI / mouse & keyboard controls
see('/game/instructions',states.Game.Instructions)
see('/game/wait',states.Game.Wait)    // (for friend to start game)
see('/game/start',states.Game.Start)  // setup game / create puck / create paddles / create shields
see('/game/play',states.Game.Play)    // unpause game
see('/game/next',states.Game.Next)    // update progress / distort screen / decide if game is really over
see('/game/pause',states.Game.Pause)  // show pause screen
see('/game/over',states.Game.Over)    // show winner!
see('/game/prompt',states.Prompt)     // show round prompt
see('/game/prompt/round',states.Prompt.Round)   // show round prompt
see('/game/prompt/level',states.Prompt.Level)   // show level prompt
see('/game/prompt/start',states.Prompt.Start)   // show level prompt
see('/game/prompt/over',states.Prompt.Over)     // show game over prompt
see('/game/invite',states.Friend.Invite)
see('/game/arrived',states.Friend.Arrived)
see('/game/cssinfo',states.Mobile.Info)
see('/game/over/cssinfo',states.Mobile.Info)
see('/cssinfo',states.Mobile.Info)
see('/error',states.Error)
see('/error/fullroom',states.Error.FullRoom)
see('/error/connection',states.Error.ConnectionError)
see('/error/datachannels',states.Error.DataChannels)
see('/error/browser',states.Error.Browser)
see('/error/lonelyroom',states.Error.Lonely)

see.on('enter',function(ctx,state){
  var name = slug(ctx.pathname)||'setup'

  if( name !== 'setup') {
    _gaq.push(['_trackPageview', name]);
  }

  $('body').addClass(name);
  $('.state.' + name).show().addClass('active enter');
  setTimeout(function(){
    $('.state.' + name).removeClass('inactive');
  },4);
  ctx.el = $('.state.' + name);
})

see.on('leave',function(ctx,state){
  var name = slug(ctx.pathname)||'setup'

  $('body').removeClass(name);
  var stateElem = $('.state.' + name).removeClass('active enter').addClass('inactive');
  stateElem.each(function(){
    if(!$(this).hasClass('animate') && $('.animate', $(this)).length < 1) {
      $(this).hide();
    }
  })
  ctx.el = $('.state.' + name);
})

see.on('error',function(err){
  console.error('see error:',err)
})

module.exports = function main(ctx){
  // add query object to ctx
  ctx.query = qs();
  see.ctx(ctx)

  setTimeout(function(){
    see('/loading') // GO!
  },4)
}

function slug(str){
  return str.replace(/^\//,'').replace(/[\/ ]/g,'-');
}

function d(enabled){
  if( enabled ) { return enabled; }
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