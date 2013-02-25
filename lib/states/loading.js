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

  see('/main-menu')
}

Loading.leave = function(ctx, next){
  var el = ctx.el;

  // wait for dmaf, then go to the main menu
  dmaf.once('dmaf_ready',function(){
    // fade out the loader
    el.remove()
    next()
  })

  // start the game loop
  ctx.game.run()

  
}