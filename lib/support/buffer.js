exports.Writer = Writer;

exports.Reader = Reader;


function Reader(buffer,offset){
  // TypedArray
  if( buffer.buffer ){
    this.data = new DataView(buffer.buffer);
    this.offset = offset || 0;
    this.littleEndian = true;

  // ArrayBuffer
  } else {
    this.data = new DataView(buffer);
    this.offset = offset || 0;
    this.littleEndian = true;
  }
}
Reader.prototype = {
  getInt8: get('getInt8',1),
  getUint8: get('getUint8',1),
  getInt16: get('getInt16',2),
  getUint16: get('getUint16',2),
  getFloat32: get('getFloat32',4),
  getFloat64: get('getFloat64',8)
}

function get(type,size){
  return function(){
    var v = this.data[type](this.offset,this.littleEndian);
    this.offset += size;
    return v;
  }
}

function Writer(buffer,offset){
  this.data = new DataView(buffer);
  this.offset = offset || 0;
  this.littleEndian = true;
}
Writer.prototype = {
  setInt8: set('setInt8',1),
  setUint8: set('setUint8',1),
  setInt16: set('setInt16',2),
  setUint16: set('setUint16',2),
  setFloat32: set('setFloat32',4),
  setFloat64: set('setFloat64',8)
}

function set(type,size){
  return function(d){
    this.data[type](this.offset,d,this.littleEndian)
    this.offset += size;
  }
}