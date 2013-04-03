var $ = require('jquery')
  , Preloader = require('preloader')
  , see = require('../support/see')
  , dmaf = require('../dmaf.min');

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

  if(!ctx.silent){
    this.loader.push(function(done){
      dmaf.addEventListener('dmaf_ready', done);
      dmaf.addEventListener('dmaf_fail', function(){
        done();
        _gaq.push(['_trackEvent', 'sound', 'failed']);
      });
      dmaf.init();
    })
  }

  if(ctx.mobile){
    // load CSS renderer
    _gaq.push(['_trackEvent', 'renderer', 'css']);

    this.loader.push(function(done){
      loadScript('/javascript/renderer-css'+ctx.ext,function(err){
        if( err ) return done(err);

        var RendererCSS = require('../renderer-css')
        ctx.renderer.set(new RendererCSS(document.getElementById('canv-css')))
        done()
      })
    })

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

    $('#canv-css .background').css('backgroundImage', 'url('+findSrc('#canv-css .background img.bg')+')');
    $('header.main-menu').css('backgroundImage', 'url('+findSrc('.mobile section.main-menu img')+')');


  } else {
    // load 3D renderer
    _gaq.push(['_trackEvent', 'renderer', '3d']);

    // preload some textures into browser cache
    // (didn't help)
    this.loader.add('/images/animals_texture_10.jpg');
    this.loader.add('/images/radial_gradient_white.png');
    // this.loader.add('/images/tape_overlay.jpg');
    // this.loader.add('/images/grid_trans.png');
    // this.loader.add('/images/grid_trans4.png');
    // this.loader.add('/images/grid.png');
    // this.loader.add('/images/texture_force_trans.png');
    // this.loader.add('/images/radial_gradient_white.png');

    this.loader.push(function(done){
      var pending = 2;
      loadScript('/javascript/libs/three'+ctx.ext,function(err){
        if( err ) return done(err);
        --pending || init()
      })
      loadScript('/javascript/renderer-3d'+ctx.ext,function(err){
        if( err ) return done(err);
        --pending || init()
      })
      function init(){
        console.time('parse 3d')
        var Renderer3D = require('../renderer-3d');
        console.timeEnd('parse 3d')
        console.time('init 3d')
        ctx.renderer.set(new Renderer3D(document.getElementById('canv-3d')))
        console.timeEnd('init 3d')
        done()
      }
    })
  }

  this.loader.end(function(){
    console.timeEnd('load')
    console.profileEnd('load')
    console.groupEnd('load')

    // start the game loop
    ctx.game.run()

    dmaf.tell('splash_screen')
    el.remove()

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

function loadScript(src,fn){
  var s = document.createElement('script');
  s.type = 'text/javascript';
  s.async = true;
  s.onerror = function(e){fn(e)};
  s.onload = function(){fn()};
  s.src = src;
  var f = document.getElementsByTagName('script')[0];
  f.parentNode.insertBefore(s, f);
}