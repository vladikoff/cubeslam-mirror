var debug = require('debug')('inputs:network')
  , buf = require('./buffer')
  , unhide = require('./util').unhide
  , diff = require('../support/diff');

Emitter(exports);

var buffered = []
  , length = 0;

exports.send = function(inputs){
  // skip empty inputs
  if( !inputs.length ){
    return;
  }

  debug('send',inputs)
  var msg = buf.build(inputs)

  // 255 byte limit because of 8bit length header
  if( msg.byteLength > 255 ){
    // TODO split into more messages
    throw new Error('invalid msg length: '+buf.byteLength);
  }

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


// a, b = world
function verify(a,b){
  debug('verify')
  if( a.code() !== b.code() ){

    var ja = JSON.stringify(a,unhide,2);
    var jb = JSON.stringify(b,unhide,2);
    console.log(diff.createPatch('diff for frame '+a.frame,ja,jb,'game','sync'))

    // alertOnce('hash codes does not match after copy. determinism is not guaranteed.')
    // err(1301,'hash codes does not match')
  }
}