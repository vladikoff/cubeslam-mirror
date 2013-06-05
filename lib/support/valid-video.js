
// if the remote video is not valid then
// send a 'request-video' to the peer which
// will then do a:
//
//  var s = getLocalStream()[0];
//  removeStream(s)
//  addStream(s)
//


module.exports = function validVideo(el){
  if( el.readyState !== el.HAVE_ENOUGH_DATA ){
    return false;
  }

  if( el.videoWidth === 0 && el.videoHeight === 0 ){
    return false;
  }

  // checks top-left, bottom-right and center
  // if the pixels are not transparent. if they
  // are then it's not valid.
  if( readPixel(el,0,0)[3] === 0 ){
    return false;
  }

  if( readPixel(el,159,119)[3] === 0 ){
    return false;
  }

  if( readPixel(el,80,60)[3] === 0 ){
    return false;
  }

  return true;
}

function readPixel(el,x,y){
  var canv = document.createElement('canvas');
  canv.width = 1;
  canv.height = 1;
  var ctx = canv.getContext('2d');
  ctx.drawImage(el,x,y,1,1,0,0,1,1);
  return ctx.getImageData(0,0,1,1).data;
}
