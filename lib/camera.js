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

  getUserMedia: function() {
    getUserMedia.call(navigator, {video: true}, this.onUserMediaSuccess.bind(this), this.onUserMediaError.bind(this));
  },

  onUserMediaSuccess: function(stream){
    this.active = true;
    console.log('user media success!')
    this.emit('userMedia', stream);
  },

  onUserMediaError: function(e){
    this.active = false;
    this.emit('userMediaError');
  }

}

Emitter(module.exports);
