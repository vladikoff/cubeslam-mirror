var debug = require('debug')('inputs:buffer')
  , Writer = require('../support/buffer').Writer
  , Reader = require('../support/buffer').Reader
  , types = require('./types')
  , str = types.toString
  , ab2s = require('./util').ab2s;

var buildBuf = new ArrayBuffer(1024); // pre-allocated buffer
var sendSeq = -1;
var recvSeq = -1;

// for reconnects
exports.reset = function(){
  sendSeq = -1;
  recvSeq = -1;
}

exports.build = function(frame,inputs){
  debug('build',frame,str(inputs))
  var dat = new Writer(buildBuf);

  // write the frame
  dat.setUint16(frame);

  for(var i=0; i<inputs.length; i++) {
    var input = inputs[i];
    switch(input[0]){
      case types.MOVE: // type, id, x
      case types.DIED: // type, id, x
        dat.setInt8(input[0])
        dat.setUint8(input[1])
        dat.setFloat64(input[2])
        break;
      case types.PING: // type, id
      case types.PONG: // type, id
        dat.setInt8(input[0])
        dat.setUint16(input[1])
        break;
      case types.HIT:  // type, x, v
        dat.setInt8(input[0])
        dat.setFloat32(input[1])
        dat.setFloat32(input[2])
        break;
      case types.MISS: // type, x
        dat.setInt8(input[0])
        dat.setFloat32(input[1])
        break;
    }
  }

  // return the written part of the buildBuf.
  return new Uint8Array(buildBuf.slice(0,dat.offset));
}

// make an Array [frame,inputs...]
exports.parse = function(buf){
  debug('parse',ab2s(buf.buffer || buf))

  // TODO will these allocations be an issue?
  var arr = [];
  var dat = new Reader(buf);

  // frame
  arr.push(dat.getUint16())

  while(dat.offset < buf.byteLength){
    var input = []
      , type = dat.getInt8();
    switch(type){
      case types.MOVE: // type, id, x
      case types.DIED: // type, id, x
        input.push(type,dat.getUint8(),dat.getFloat64())
        break;
      case types.PING: // type, id
      case types.PONG: // type, id
        input.push(type,dat.getUint16())
        break;
      case types.HIT:  // type, x, v
        input.push(type,dat.getFloat32(),dat.getFloat32())
        break;
      case types.MISS: // type, x
        input.push(type,dat.getFloat32())
        break;
    }
    arr.push(input);
  }
  return arr;
}

exports.wrap = function(messages,length){
  // 2 = 16bit sequence
  // length = total length of messages
  // messages.length = 8bit length of each message
  var buf = new Uint8Array(2+length+messages.length)
    , off = 0
    , seq = ++sendSeq;

  // write sequence (manual 16bit > 2*8bit)
  buf[off++] = (seq >> 8) & 0xff
  buf[off++] = (seq >> 0) & 0xff

  while(messages.length){
    var msg = messages.shift();
    buf[off++] = msg.byteLength;
    buf.set(msg,off);
    off += msg.byteLength;
  }
  return buf;
}

exports.unwrap = function(buf,messages){
  debug('unwrap',buf.byteLength) // ab2s(buf)

  // check for empty messages
  if( !buf.byteLength ){
    return false;
  }

  // expect multiple frames in one buf
  // buf: [len,msg...]
  var arr = new Uint8Array(buf);

  // extract 16bit sequence
  // (see envelop() for the other end)
  var seq = (arr[0] << 8) + arr[1];

  // verify sequence
  if( !verifySequence(seq) ){
    return false;
  }

  // get each input and add them to the
  // messages array
  for(var offset=2; offset<arr.byteLength;){
    var len = arr[offset++];
    messages.push(arr.buffer.slice(offset,offset+len));
    offset += len;
  }

  return messages.length > 0;
}


// checks if last message sequence was
// more than 1 frame away = DROPPED!
function verifySequence(seq){
  if( Math.abs(recvSeq - seq) > 1 ){
    throw new Error('dropped packets. determinism is not guaranteed.')
  } else if( recvSeq === seq ){
    console.warn('packet %s received twice. skipping.',seq)
    return false;
  }
  recvSeq = seq;
  return true;
}
