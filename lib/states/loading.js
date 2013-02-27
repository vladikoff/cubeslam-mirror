var $ = require('jquery')
  , see = require('../support/see');

var Loading = exports;

Loading.enter = function(ctx){
  if( !ctx.game )
    throw new Error('invalid state. missing game.')
  if( !ctx.renderer )
    throw new Error('invalid state. missing renderer.')
  if( !ctx.network )
    throw new Error('invalid state. missing network.')

  see('/main-menu')
}

Loading.leave = function(ctx, next){
  var el = ctx.el;
  var completed = false;
  var dmafComplete = function(){
    if( completed ) return;
    completed = true;

    console.timeEnd('load')
    console.profileEnd('load')
    console.groupEnd('load')
    dmaf.tell('splash_screen')

    next()
    el.remove()
  }

  // wait for dmaf, then go to the main menu
  dmaf.once('dmaf_ready',dmafComplete);
  dmaf.once('dmaf_fail',dmafComplete);

  // start the game loop
  ctx.game.run()

}