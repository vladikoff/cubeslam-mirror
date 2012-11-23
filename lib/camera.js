var cameraAttention = require('./camera-attention')
  , Emitter = require('emitter');

var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
module.exports = {

  active: false,

  start: function() {

    cameraAttention.show(function() {

      // request usermedia (if "ok" it will be inputs.userMedia)
      // and will be used for motion tracking as well as sent
      // along to the other player as a MediaStream.

      console.log('requesting user media')
      if( getUserMedia ){
        getUserMedia.call(navigator, {video: true}, this.onUserMediaSuccess.bind(this), this.onUserMediaError.bind(this));
      } else {
        // moms, dads, grandmas, and grandpas <-- lulz!
        alert("sorry, no webcam support.")
      }

    }.bind(this));
  },

  onUserMediaSuccess: function(stream){
    this.active = true;
    console.log('user media success!')
    this.emit('userMedia', stream);
  },

  onUserMediaError: function(e){
    this.active = false;
    cameraAttention.hide();

    console.log('user media error!')
    console.error(e)
  }

}

Emitter(module.exports);
