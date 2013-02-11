var $ = require('jquery')
  , see = require('../support/see');

var Loading = exports;

Loading.enter = function enterLoadingAsync(ctx){
  if( !ctx.game )
    throw new Error('invalid state. missing game.')
  if( !ctx.renderer )
    throw new Error('invalid state. missing renderer.')
  if( !ctx.network )
    throw new Error('invalid state. missing network.')

  // var timeout = 10
  // console.log('wait %s until see(main-menu)',timeout)
  // setTimeout(see,timeout,'/main-menu')
  
  see('/main-menu')
}

Loading.leave = function leaveLoadingSync(ctx, next){

  //save reference before calling next
  var el = ctx.el;

  //kickof next stage
  next()
  ctx.game.run()  
  
  el.delay(100).fadeOut(400, function(){
    el.remove();
  })

}