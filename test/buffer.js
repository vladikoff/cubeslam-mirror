var src = typeof process == 'undefined' ? 'slam' : '..';
var Reader = require(src+'/lib/support/buffer').Reader
  , Writer = require(src+'/lib/support/buffer').Writer;

var u8 = new Uint8Array([1,2,3,4]);
var u16 = new Uint16Array([512,1024,2048])
var f32 = new Float32Array([1.5,-123123])

var r = new Reader(u8);
eql(r,r.getUint8(),1)
eql(r,r.getUint8(),2)
eql(r,r.getUint8(),3)
eql(r,r.getUint8(),4)

var r = new Reader(u16);
eql(r,r.getUint16(),512)
eql(r,r.getUint16(),1024)
eql(r,r.getUint16(),2048)

var r = new Reader(f32);
eql(r,r.getFloat32(),1.5)
eql(r,r.getFloat32(),-123123)

var arr = new Uint8Array([0,1,2,3,0,1,2,3,0,1,2,3])
  , b1 = arr.subarray(0,4)
  , b2 = arr.subarray(4,8)
  , b3 = arr.subarray(8,12);

var r = new Reader(b1);
eql(r,r.getUint8(),0)
eql(r,r.getUint8(),1)
eql(r,r.getUint8(),2)
eql(r,r.getUint8(),3)

var r = new Reader(b2);
eql(r,r.getUint8(),0)
eql(r,r.getUint8(),1)
eql(r,r.getUint8(),2)
eql(r,r.getUint8(),3)

var r = new Reader(b3);
eql(r,r.getUint8(),0)
eql(r,r.getUint8(),1)
eql(r,r.getUint8(),2)
eql(r,r.getUint8(),3)

var buf = new ArrayBuffer(1024);
var w = new Writer(buf);
w.setInt8(10)
w.setUint8(130)
w.setInt16(1024)
w.setUint16(1024)
w.writeString('hello world!')

var res = buf.slice(0,w.offset);
var r = new Reader(res);
eql(r,r.getInt8(),10)
eql(r,r.getUint8(),130)
eql(r,r.getInt16(),1024)
eql(r,r.getUint16(),1024)
eql(r,r.readString(),'hello world!')

var w = new Writer(buf);
w.setInt8(20)
w.setUint8(130)
w.setInt16(1024)

var res = buf.slice(0,w.offset);
var r = new Reader(res);
eql(r,r.getInt8(),20)
eql(r,r.getUint8(),130)
eql(r,r.getInt16(),1024)


function eql(r,a,b){
  console.assert(a===b,a+' !== '+b+' '+str(r.data.buffer));
}
function str(buffer){
  return [].join.call(new Uint8Array(buffer))
}