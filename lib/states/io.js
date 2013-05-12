var $ = require('jquery')
  , settings = require('../settings');

exports.enter = function(ctx){
  if( ctx.room.indexOf('io') !== 0 ){
    return;
  }

  // overrides when using /io
  ctx.query.autonav = true;
  ctx.query.ns = 'single';
  ctx.query.level = '1';
  ctx.query.extras = 'x'; // added "x" because empty string will be ignored
  ctx.query.signal = 'ws';

  // workaround for the video being read
  // with flipped color channels on nexus 10 and 7.
  var nexus = navigator.userAgent.indexOf('Nexus 10') > -1 ||
              navigator.userAgent.indexOf('Nexus 7') > -1;

  if( nexus ){
    console.warn('INVERTING BGR!')
    settings.data.bgr = true;
    ctx.query.quality = 'mobile';
    $('#footer').hide()
  } else {
    console.warn('NOT INVERTING BGR!')
    ctx.query.quality = 'low';
  }

  // temp
  if( ctx.dev ){
    ctx.silent = true;
    ctx.query.benchmark = true;
    // ctx.query.play = true;
    // ctx.query.renderer = 'none';
  }

  // hide some overlying elements
  // (hidden #footer will also resize the #game to fit)
  $('#canv-2d,#canv-db,#canv-css,#settingsGUIContainer').hide()

  $('html').addClass('io')
}