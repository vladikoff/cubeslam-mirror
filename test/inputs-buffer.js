var src = typeof process == 'undefined' ? 'slam' : '..';
var buf = require(src+'/lib/inputs/buffer')
  , Reader = require(src+'/lib/support/buffer').Reader;

var MOVE_X = [1,0, 10];
var MOVE_Y = [1,1,-10];
var HIT_A = [2,0];
var HIT_B = [2,1];

var PING_A = [-1,10];
var PONG_A = [-2,10];
var PING_B = [-1,70];
var PONG_B = [-2,70];

var msg = buf.build(0,[MOVE_X,HIT_A])

var r = new Reader(msg);
console.assert(r.getUint16()  === 0) // frame
console.assert(r.getInt8()    === MOVE_X[0])
console.assert(r.getUint8()   === MOVE_X[1])
console.assert(r.getFloat64() === MOVE_X[2])
console.assert(r.getInt8()    === HIT_A[0])
console.assert(r.getUint8()   === HIT_A[1])

var inputs = buf.parse(msg);
console.assert(inputs.length === 3) // frame, msg1, msg2
console.assert(inputs[0]    === 0)     // frame
console.assert(inputs[1][0] === MOVE_X[0])
console.assert(inputs[1][1] === MOVE_X[1])
console.assert(inputs[1][2] === MOVE_X[2])
console.assert(inputs[2][0] ===  HIT_A[0])
console.assert(inputs[2][1] ===  HIT_A[1])

var msg1 = buf.build(0,[MOVE_X,HIT_B]) // MOVE(0,10), HIT(1)
var msg2 = buf.build(1,[HIT_A,MOVE_Y]) // HIT(0), MOVE(1,-10)
var sent = buf.wrap([msg1,msg2],msg1.byteLength+msg2.byteLength);

var messages = []
var recv = buf.unwrap(sent,messages)
console.assert(recv)
console.assert(messages.length == 2)

var inputs = buf.parse(messages[0]);
console.assert(inputs.length === 3) // frame, msg1, msg2
console.assert(inputs[0]    === 0)     // frame
console.assert(inputs[1][0] === MOVE_X[0])
console.assert(inputs[1][1] === MOVE_X[1])
console.assert(inputs[1][2] === MOVE_X[2])
console.assert(inputs[2][0] ===  HIT_B[0])
console.assert(inputs[2][1] ===  HIT_B[1])

var inputs = buf.parse(messages[1]);
console.assert(inputs.length === 3) // frame, msg1, msg2
console.assert(inputs[0]    === 1)     // frame
console.assert(inputs[1][0] ===  HIT_A[0])
console.assert(inputs[1][1] ===  HIT_A[1])
console.assert(inputs[2][0] === MOVE_Y[0])
console.assert(inputs[2][1] === MOVE_Y[1])
console.assert(inputs[2][2] === MOVE_Y[2])

var ping = buf.build(0,[MOVE_X,PING_A])
var pong = buf.build(1,[PONG_A,PING_B,PONG_B])
var sent = buf.wrap([ping,pong],ping.byteLength+pong.byteLength);


messages.length = 0
var recv = buf.unwrap(sent,messages)
console.assert(recv)
console.assert(messages.length == 2)

var inputs = buf.parse(messages[0]);
console.assert(inputs.length === 3) // frame, move x, ping a
console.assert(inputs[0]    === 0)     // frame
console.assert(inputs[1][0] === MOVE_X[0])
console.assert(inputs[1][1] === MOVE_X[1])
console.assert(inputs[1][2] === MOVE_X[2])
console.assert(inputs[2][0] === PING_A[0])
console.assert(inputs[2][1] === PING_A[1])

var inputs = buf.parse(messages[1]);
console.assert(inputs.length === 4) // frame, pong a, ping b, pong b
console.assert(inputs[0]    === 1)     // frame
console.assert(inputs[1][0] === PONG_A[0])
console.assert(inputs[1][1] === PONG_A[1])
console.assert(inputs[2][0] === PING_B[0])
console.assert(inputs[2][1] === PING_B[1])
console.assert(inputs[3][0] === PONG_B[0])
console.assert(inputs[3][1] === PONG_B[1])
