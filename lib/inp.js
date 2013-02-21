// inputs.record(MOVE|PLAY|PAUSE|OVER,args) // validate, buffer
// inputs.update() // network.send(packet(buffer)), enqueue(local), execute(game)
// network.on('message',parse) // enqueue(network)
// enqueue(queue) -> fwd(sync) execute(game) execute(sync)
//   -> replay(game) -> execute(game)
//

var Emitter = require('emitter')
  , World = require('./world')
  , actions = require('./actions')
  , hashCode = require('./support/hash-code');

var buffer = [];
var buildBuf = new ArrayBuffer(512); // pre-allocated buffer
var sequence = 0;
var lastSeq = 0;
var sync, game;
var queues = {loc:[], net:[]};

Emitter(exports);

// sets the "sync" and "game" variable
exports.context = function(ctx){
  sync = ctx.networkGame;
  game = ctx.game;
}

// called whenever a new input has happened
exports.record = function(){
  // validate
  validate(arguments);

  // buffer
  buffer.push(arguments);
}

// should be called by a game "update" event
exports.update = function(world){
  // skip if buffer is empty
  if( !buffer.length )
    // send ACKs?
    return;

  for(var i=0; i<buffer.length; i++){
    // execute each input on "game"
    execute(world,buffer[i]);

    // enqueue locally
    sync && enqueue(queues.loc,world.frame,buffer[i])
  }
  // send to network
  sync && exports.emit('message',build(world.frame,buffer))

  // send hashes?

  // reset buffer
  buffer.length = 0;
}

// should be called by a network "message" event
exports.onmessage = function(buf){
  var inputs = parse(buf);
  var frame = inputs[0];
  for(var i=1; i<inputs.length; i++){
    enqueue(queues.net,frame,inputs[i])
  }
}

function validate(input){
  switch(input[0]){
    case World.MOVE: // index, x
      if( input.length == 3 )
        break;
    case World.PLAY:
    case World.PAUSE:
    case World.OVER: // no args
      if( input.length == 1 )
        break;
    default:
      throw new Error('invalid input')
  }
}

function enqueue(queue,frame,input){
  // verify that the queue is in order (frame > last frame in queue)
  var last = queue[queue.length-2];
  if( frame < last ){
    throw new Error('cannot enqueue input too early')
  }

  // add to queue
  queue.push(frame,input)

  // lowest common frame
  var to = Math.min(queue === queues.net ? game.world.frame : sync.world.frame, frame)
  forward(to) && replay()
}

function dequeue(queue,world){
  // verify that the frame has not passed the first frame in queue
  if( queue[0] < frame ){
    throw new Error('cannot pass the first frame in queue')
  }

  // execute inputs in queue matching the frame
  while(queue[0]===world.frame){
    var frame = queue.shift()
      , input = queue.shift();
    execute(world,input)
  }
}

function forward(to){
  var a = sync.world.frame;
  for(var i=a; i<to; i++){
    dequeue(queues.loc,sync.world)
    dequeue(queues.net,sync.world)
    sync.update()
  }
  // return true (thus replay) if it actually moved forward
  return a < sync.world.frame;
}

function replay(){
  var a = sync.world.frame;
  var b = game.world.frame;

  // copy "sync" to "game"
  game.copy(sync);

  // verify that the copy worked (hashCode)
  verify(game.world,sync.world)

  // sounds? start/end events?

  // use a copy of the queues
  var loc = queues.loc.slice();
  var net = queues.net.slice();

  // execute and update
  for(var i=a; i<b; i++){
    dequeue(loc,game.world)
    dequeue(net,game.world)
    game.update()
  }
}

function execute(world,input){
  switch(input[0]){
    case World.MOVE:  return actions.movePaddle(world,input[1],input[2]);
    case World.PLAY:  return actions.gameResume(world);
    case World.PAUSE: return actions.gamePause(world);
    case World.OVER:  return actions.gameOver(world);
  }
}


function build(frame,arr){
  var data = new buffer.Writer(buildBuf);
  data.setUint16(sequence++);
  data.setUint16(frame);
  for(var i=0; i < arr.length;) {
    switch(type){
      case World.MOVE:
        data.setInt8(inputs[i++]);    // type
        data.setUint8(inputs[i++]);   // id
        data.setFloat32(inputs[i++]); // x
        break;
      case World.ACK:
      case World.PAUSE:
      case World.PLAY:
      case World.OVER:
        data.setInt8(inputs[i++]);    // type
        break;
    }
  }
  // return the written part of the buildBuf.
  return new Uint8Array(buildBuf).subarray(0,data.offset).buffer;
}


// make an Array [frame,inputs...]
function parse(buf){
  var arr = [];
  var dat = new buffer.Reader(buf);
  var seq = data.getUint16()
  arr.push(data.getUint16()) // frame

  // verify sequence
  if( lastSeq && Math.abs(lastSeq-seq) > 1 ){
    throw new Error('dropped packets. game will lose sync.')
  }
  lastSeq = seq;

  while(data.offset < buf.byteLength){
    var type = data.getInt8();
    switch(type){
      case World.ACK:
      case World.PLAY:
      case World.PAUSE:
      case World.OVER: // type
        arr.push(type)
        break;
      case World.MOVE: // type, id, x
        arr.push(type,data.getUint8(),data.getFloat32())
        break;
    }
  }
  return arr;
}

// a, b = world
var EXCLUDED = ['me','opponent','name'];
function verify(a,b){
  var ha, hb;
  exclude(a,EXCLUDED,function(world){ ha = hashCode(world) })
  exclude(b,EXCLUDED,function(world){ hb = hashCode(world) })
  if( ha !== hb ){
    throw new Error('hash codes does not match');
  }
}