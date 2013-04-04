var debug = require('debug')('inputs:network')
  , buf = require('./buffer')

Emitter(exports);

var buffered = []
  , length = 0;

exports.send = function(inputs){
  debug('send',inputs)
  var msg = buf.build(inputs)
  buffered.push(msg);
  length += msg.byteLength;
}

exports.flush = function(){
  if( length ){
    var msg = buf.envelop(buffered,length)
    exports.emit('message',msg)
    buffered.length = 0;
    length = 0;
  }
}

exports.onmessage = function(buffer){
  var messages = []; // TODO don't re-allocate

  // unwrap the arraybuffer into its messages
  if( buf.free(buffer,messages) ){
    for(var i=0; i<messages.length; i++){
      var inputs = buf.parse(msg);
      var frame = inputs[0];
      for(var i=1; i<inputs.length; i++){
        // frame, inputs[i]
        // TODO what?
      }

      // ack is the last acknowledged frame
      // it's as far as we can forward and
      // know that we'll stay in sync
      // ack = Math.max(ack,frame);
    }
  }
}
