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
  // see('/error/fullroom')
  // see('/friend/accept')
  // see('/friend/arrived')
  // see('/friend/waiting')
}

Loading.leave = function(ctx, next){
  var el = ctx.el;

  // wait for dmaf, then go to the main menu
  if( !ctx.silent ){
    if( dmaf.unavailable ){
      this.loader.push(function(done){
        var s = document.createElement('script');
        s.type = 'text/javascript';
        s.async = true;
        s.onerror = function(e){
          console.warn('error while including dmaf:'+e.stack);
          done();
        }
        s.onload = function(){
          dmaf.once('dmaf_ready',done);
          dmaf.once('dmaf_fail',done);
          dmaf.init()
        };
        s.src = '/javascript/dmaf.min.js';
        var f = document.getElementsByTagName('script')[0];
        f.parentNode.insertBefore(s, f);
      })

    } else {
      this.loader.push(function(done){
        dmaf.once('dmaf_ready',done);
        dmaf.once('dmaf_fail',done);
        dmaf.init()
      })
    }
  }

  if(ctx.mobile) {
    //css backgrounds
    this.loader.add('/images/mobile/puck.png');
    this.loader.add('/images/mobile/paddle-p1.png');
    this.loader.add('/images/mobile/paddle-p2.png');
    this.loader.add('/images/mobile/shields.png');
    this.loader.add('/images/mobile/bear.png');
    this.loader.add('/images/mobile/extra-icons.png');
    this.loader.add('/images/mobile/effects.png');
    this.loader.add('/images/mobile/obstacles.png');
    this.loader.add(findSrc('.mobile section.main-menu img'));
    this.loader.add(findSrc('#canv-css .background img.bg'));

    $('#canv-css .background')
      .css('backgroundImage', 'url('+findSrc('#canv-css .background img.bg')+')');
    $('header.main-menu')
      .css({backgroundImage: 'url('+findSrc('.mobile section.main-menu img')+')'});
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

function findSrc(el){
  if( $(document).width() > 800 ){
    return $(el).data('src-tablet');
  } else {
    return $(el).data('src-mobile');
  }
}