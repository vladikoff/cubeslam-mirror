var cameraAttention = require('./camera-attention')
  , Emitter = require('emitter');

var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
module.exports = {

  active: false,

  start: function() {

//    cameraAttention.show(function() {

      console.log('requesting user media')
      if( getUserMedia ){
        this.getUserMedia();
      } else {
        // moms, dads, grandmas, and grandpas <-- lulz!
        alert("sorry, no webcam support.")
      }

//    }.bind(this));
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

    console.log('user media error!')
//    console.error(e)

    this.getUserMedia();
  }

}

Emitter(module.exports);
