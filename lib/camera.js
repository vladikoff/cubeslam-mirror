var cameraAttention = require('./camera-attention')
  , settings = require('./settings')
  , Emitter = require('emitter')
  , $ = require('jquery');

var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
module.exports = {

  active: false,

  start: function() {
    //cameraAttention.show(function() {
      console.log('requesting user media')
      if( getUserMedia ){
        this.getUserMedia();
      } else {
        this.onUserMediaError();
      }

      //hide settings temporarily if shown
      $("#settingsGUIContainer").css('opacity',0);

  //  }.bind(this));
  },

  hide: function() {
    cameraAttention.hide();

    //show settings again if shown
    $("#settingsGUIContainer").css('opacity',1);
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
