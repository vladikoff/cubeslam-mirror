var $ = require('jquery')
  , see = require('../support/see');

var Loading = exports;

Loading.enter = function enterLoadingAsync(ctx){
  console.log('entering loading')
  // events in app.js handles dom class toggling

  if( !ctx.network )
    throw new Error('invalid state. missing network.')

  if( !ctx.game )
    throw new Error('invalid state. missing game.')

  if( !ctx.renderer )
    throw new Error('invalid state. missing renderer.')

  console.log('wait 2s until see(main-menu)')
  setTimeout(see,000,'/main-menu')
}

Loading.leave = function leaveLoadingSync(){
  $('.state.loading').remove();
}