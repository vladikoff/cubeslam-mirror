var $ = require('jquery');

exports.enter = function(ctx){
  if( ctx.room !== 'io'){
    return;
  }

  // overrides when using /io
  ctx.query.autonav = true;
  ctx.query.quality = 'mobile';

  if( ctx.dev ){
    ctx.silent = true;

    // temp
    ctx.benchmark = true;
    ctx.query.play = true;
    $('#benchmarks').css({
      position: 'absolute',
      top: 50,
      background: 'white'
    })
  }

  // hide some overlying elements
  // (hidden #footer will also resize the #game to fit)
  $('#canv-2d,#canv-db,#canv-css,#footer,#settingsGUIContainer').hide()
}