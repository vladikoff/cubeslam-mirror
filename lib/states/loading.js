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

  console.timeEnd('load')
  console.profileEnd('load')
  console.groupEnd('load')

  // wait for dmaf, then go to the main menu
  dmaf.once('dmaf_ready',function(){
    see('/main-menu')
  })
}

Loading.leave = function(ctx, next){
  // save reference before calling next
  var el = ctx.el;

  //kickof next stage
  next()
  ctx.game.run()

  el.delay(100).fadeOut(400, function(){
    el.remove();
  })
}