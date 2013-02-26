if( typeof process == 'undefined' ){
  var Reader = require('paddle-battle/lib/support/buffer').Reader
    , Writer = require('paddle-battle/lib/support/buffer').Writer;
} else {
  var Reader = require('../lib/support/buffer').Reader
    , Writer = require('../lib/support/buffer').Writer;
}

var u8 = new Uint8Array([1,2,3,4]);
var u16 = new Uint16Array([512,1024,2048])
var f32 = new Float32Array([1.5,-123123])

var r = new Reader(u8);
console.assert(r.getUint8() === 1)
console.assert(r.getUint8() === 2)
console.assert(r.getUint8() === 3)
console.assert(r.getUint8() === 4)

var r = new Reader(u16);
console.assert(r.getUint16() === 512)
console.assert(r.getUint16() === 1024)
console.assert(r.getUint16() === 2048)

var r = new Reader(f32);
console.assert(r.getFloat32() === 1.5)
console.assert(r.getFloat32() === -123123)


var arr = new Uint8Array([0,1,2,3,0,1,2,3,0,1,2,3])
  , b1 = arr.subarray(0,4)
  , b2 = arr.subarray(4,8)
  , b3 = arr.subarray(8,12);

var r = new Reader(b1);
console.assert(r.getUint8() === 0)
console.assert(r.getUint8() === 1)
console.assert(r.getUint8() === 2)
console.assert(r.getUint8() === 3)

var r = new Reader(b2);
console.assert(r.getUint8() === 0)
console.assert(r.getUint8() === 1)
console.assert(r.getUint8() === 2)
console.assert(r.getUint8() === 3)

var r = new Reader(b3);
console.assert(r.getUint8() === 0)
console.assert(r.getUint8() === 1)
console.assert(r.getUint8() === 2)
console.assert(r.getUint8() === 3)