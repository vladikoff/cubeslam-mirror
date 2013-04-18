var dmaf = require('./dmaf.min')
  , cookie = require('cookie')
  , $ = require('jquery')

// sound('on') / sound('off') / sound()

module.exports = function sound(toggle,skipTrackGA,skipCookie){
  var el = $('.sound-switch');
  if( typeof toggle == 'undefined' ){
    toggle = el.hasClass('on') ? 'off' : 'on';
  } else if( toggle == 'on' || toggle == 'off' ){
    toggle = toggle
  } else {
    toggle = toggle ? 'on' : 'off';
  }

  switch(toggle){
    case 'on':

      if( !skipTrackGA) _gaq.push(['_trackEvent', 'sound', 'on']);
      el.removeClass('off').addClass('on');
      if( dmaf.tell ) dmaf.tell('sound_on');
      if(!skipCookie) cookie('sound', 'on');
      break;

    case 'off':
      if( !skipTrackGA) _gaq.push(['_trackEvent', 'sound', 'off']);
      el.removeClass('on').addClass('off');
      if( dmaf.tell ) dmaf.tell('sound_off');
      if(!skipCookie) cookie('sound', 'off');
      break;

    default:
      throw new Error('you\'re doing it wrong.');
  }
}