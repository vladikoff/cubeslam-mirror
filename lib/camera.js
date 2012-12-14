var cameraAttention = require('./camera-attention')
  , settings = require('./settings')
  , Emitter = require('emitter');

var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
module.exports = {

  active: false,

  start: function() {
    cameraAttention.show(function() {
      console.log('requesting user media')
      if( getUserMedia ){
        this.getUserMedia();
      } else {
        this.onUserMediaError();
      }
    }.bind(this));
  },

  hide: function() {
    cameraAttention.hide();
  },

  getUserMedia: function(){
    // Temporary fix to add audio only when on appspot.com
    getUserMedia.call(navigator, {video: true, audio: window.location.hostname.indexOf('appspot.com') != -1}, this.onUserMediaSuccess.bind(this), this.onUserMediaError.bind(this));
  },

  onUserMediaSuccess: function(stream){
    this.active = true;
    this.emit('userMedia', stream);
  },

  onUserMediaError: function(e){
    this.active = false;
    this.emit('userMediaError');
  }

}

Emitter(module.exports);
