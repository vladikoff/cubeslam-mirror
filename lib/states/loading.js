/* global _gaq: true */

var $ = require('jquery')
  , Preloader = require('preloader')
  , see = require('../support/see')
  , dmaf = require('../dmaf.min');

var Loading = exports;

Loading.enter = function(ctx){
  this.loader = new Preloader();

  // when network is not available but there's already
  // someone else in the room we show  "Install chrome to play 2p"
  if( !ctx.network.available && $('body').hasClass('room-lonely') ){
    see('/error/datachannels');

  // otherwise simply go to the main menu.
  } else {
    see('/main-menu')
  }
}

Loading.leave = function(ctx, next){
  var el = ctx.el;

  if(!ctx.silent){
    this.loader.push(function(done){
      dmaf.addEventListener('dmaf_ready', function(){ done() });
      dmaf.addEventListener('dmaf_fail', function(){
        done();
        _gaq.push(['_trackEvent', 'sound', 'failed']);
      });
      dmaf.init('/dmaf__assets/');
    })
  }

  //add workaround for scores not showing when transforms not supported fully
  if( !Modernizr.csstransforms3d ) {
    $("#scores").addClass("no-transforms");
  }

  if( ctx.query.renderer == 'css' ){
    // load CSS renderer
    _gaq.push(['_trackEvent', 'renderer', 'css']);

    this.loader.push(function(done){
      console.time('load css')
      loadScript('/javascript/renderer-css'+ctx.ext,function(err){
        console.timeEnd('load css')
        if( err ){return done(err)}
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


  } else if( ctx.query.renderer != 'none' ){
    // load 3D renderer
    _gaq.push(['_trackEvent', 'renderer', '3d']);



    this.loader.push(function(done){
      console.time('load 3d')
      var pending = 3;
      loadScript('/javascript/libs/tween-max.min.js',check)
      loadScript('/javascript/libs/three'+ctx.ext,check)
      loadScript('/javascript/renderer-3d'+ctx.ext,check)
      function check(err){
        if( err ){return done(err)}
        --pending || init()
      }
      function init(){
        console.timeEnd('load 3d')
        console.time('init 3d')
        console.groupCollapsed('init 3d')

        var Renderer3D = require('../renderer-3d');



        var renderer = new Renderer3D(document.getElementById('canv-3d'))
        renderer.on('initDone',function(){
          console.groupEnd('init 3d')
          console.timeEnd('init 3d')
          done()
        })
        ctx.renderer.set(renderer)
      }
    })
  }

  this.loader.end(function(err){
    console.timeEnd('load')
    console.groupEnd('load')

    // start the game loop
    ctx.game.run()
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