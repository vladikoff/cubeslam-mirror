var src = typeof process == 'undefined' ? 'slam' : '..';
var buf = require(src+'/lib/inputs/buffer')
  , Reader = require(src+'/lib/support/buffer').Reader;

var msg = buf.build(0,[[1,0,10],[2,1]]) // MOVE(0,10), HIT(1)

var r = new Reader(msg);
console.assert(r.getUint16() === 0) // frame
console.assert(r.getInt8() === 1) // msg 1 type
console.assert(r.getUint8() === 0) // msg 1 id
console.assert(r.getFloat32() === 10) // msg 1 x
console.assert(r.getInt8() === 2) // msg 2 type
console.assert(r.getUint8() === 1) // msg 2 id

var inputs = buf.parse(msg);
console.assert(inputs.length === 3) // frame, msg1, msg2
console.assert(inputs[0] === 0) // frame
console.assert(inputs[1][0] === 1)  // msg 1 type
console.assert(inputs[1][1] === 0)  // msg 1 id
console.assert(inputs[1][2] === 10)  // msg 1 x
console.assert(inputs[2][0] === 2)  // msg 2 type
console.assert(inputs[2][1] === 1)  // msg 2 id

var msg1 = buf.build(0,[[1,0,10],[2,1]]) // MOVE(0,10), HIT(1)
var msg2 = buf.build(1,[[2,0],[1,1,-10]]) // HIT(0), MOVE(1,-10)
var dat = buf.wrap([msg1,msg2],msg1.byteLength+msg2.byteLength);
// console.log(dat)
// TODO make proper result test here that doesn't require output