var debug = require('debug')('camera')
  , settings = require('./settings')
  , Emitter = require('emitter')
  , $ = require('jquery');

var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
module.exports = {

  active: false,

  start: function(){
    debug('start')
    if( getUserMedia ){
      this.getUserMedia();
    } else {
      this.onUserMediaError();
    }

    //hide settings temporarily if shown
    $("#settingsGUIContainer").css('opacity',0);
  },

  hide: function() {
    debug('hide')
    //show settings again if shown
    $("#settingsGUIContainer").css('opacity',1);
  },

  getUserMedia: function(){
    debug('getUserMedia')
    // Temporary fix to add audio only when on appspot.com
    getUserMedia.call(navigator, {
      video: true,
      audio: window.location.hostname.indexOf('appspot.com') != -1
    }, this.onUserMediaSuccess.bind(this), this.onUserMediaError.bind(this));
  },

  onUserMediaSuccess: function(stream){
    debug('onUserMediaSuccess')
    this.active = true;
    this.emit('userMedia', stream);
  },

  onUserMediaError: function(e){
    debug('onUserMediaError',e)
    this.active = false;
    this.emit('userMediaError');
  }

}

Emitter(module.exports);
