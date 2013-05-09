var $ = require('jquery');

exports.enter = function(ctx){
  if( ctx.room !== 'io'){
    return;
  }

  // overrides when using /io
  ctx.query.autonav = true;
  ctx.query.quality = 'mobile';
  ctx.query.ns = 'single';
  ctx.query.level = '1';
  ctx.query.extras = 'x';

  // temp
  if( ctx.dev ){
    ctx.silent = true;
    ctx.query.benchmark = true;
    ctx.query.play = true;
    // ctx.query.renderer = 'none';
  }

  // hide some overlying elements
  // (hidden #footer will also resize the #game to fit)
  $('#canv-2d,#canv-db,#canv-css,#footer,#settingsGUIContainer').hide()
}