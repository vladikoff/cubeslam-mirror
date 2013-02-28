var $ = require('jquery')
  , Preloader = require('preloader')
  , see = require('../support/see');

var Loading = exports;

Loading.enter = function(ctx){
  this.loader = new Preloader;
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

  // wait for dmaf, then go to the main menu
  this.loader.push(function(done){
    dmaf.once('dmaf_ready',done);
    dmaf.once('dmaf_fail',done);
  })
  
  if(ctx.mobile) {
    //css backgrounds
    this.loader.add('/images/mobile/puck.png');
    this.loader.add('/images/mobile/paddle-p1.png');
    this.loader.add('/images/mobile/paddle-p2.png');
    this.loader.add('/images/mobile/shields.png');
    this.loader.add('/images/mobile/bear.png');
    this.loader.add('/images/mobile/extra-icons.png');

    var startImgEl = $('.mobile section.main-menu img')
      , gameBoardImgEl = $('#canv-css .background img.bg')
      , startImg = startImgEl.data('src-mobile')
      , gameBoardImg = gameBoardImgEl.data('src-mobile');

    if( $(document).width() > 800 ) {
      startImg = startImgEl.data('src-tablet')
      gameBoardImg = gameBoardImgEl.data('src-tablet')
    }
    this.loader.add(startImg);
    this.loader.add(gameBoardImg);
    
    $('#canv-css .background')
      .css('backgroundImage', 'url('+gameBoardImg+')');
    $('header.main-menu')
      .css({backgroundImage: 'url('+startImg+')'});
  }


  this.loader.end(function(){
    console.timeEnd('load')
    console.profileEnd('load')
    console.groupEnd('load')

    // start the game loop
    dmaf.tell('splash_screen')
    el.remove()
    ctx.game.run()
    next()
  })

}