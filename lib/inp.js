// inputs.record(MOVE|PLAY|PAUSE|OVER,args) // validate, buffer
// inputs.update() // network.send(packet(buffer)), enqueue(local), execute(game)
// network.on('message',parse) // enqueue(network)
// enqueue(queue) -> fwd(sync) execute(game) execute(sync)
//   -> replay(game) -> execute(game)
//

var debug = require('debug')('inputs')
  , Emitter = require('emitter')
  , World = require('./world')
  , actions = require('./actions')
  , Writer = require('./support/buffer').Writer
  , Reader = require('./support/buffer').Reader;

var buffer = [];
var buildBuf = new ArrayBuffer(1024); // pre-allocated buffer
var sequence = 0;
var lastSeq = 0;
var sync, game;
var queues = {loc:[], net:[]};
var replaying = false;
var sent = 0;
var paused = false;
var willPause = false;

Emitter(exports);

// sets the "sync" and "game" variable
exports.context = function(ctx){
  debug('context',!!ctx.networkGame,!!ctx.game)
  sync = ctx.networkGame;
  game = ctx.game;
}

exports.reset = function(){
  debug('reset')
  queues.loc.length = 0
  queues.net.length = 0
  buffer.length = 0
  sent = 0
  lastSeq = 0
  sequence = 0
}

// will pause after next update unless
// `now` is set to `true`. this is to
// make sure the current buffer will be
// drained first.
exports.pause = function(now){
  debug('pause')
  if( now )
    paused = true;
  else
    willPause = true;
}

exports.resume = function(){
  debug('resume')
  paused = false;
  willPause = false;
}

// called whenever a new input has happened
exports.record = function(){
  debug('record %s', replaying ? '(replay)' : '', arguments)

  // skip while replaying (already enqueued)
  if( replaying ) return;

  // validate
  validate(arguments);

  // buffer
  buffer.push([].slice.call(arguments));
}

// should be called by a game "update" event
exports.update = function(world){
  // debug('update',buffer.length)

  // skip if replaying
  if( replaying ){
    return;
  }

  // skip if paused
  if( paused ){
    return;
  }

  // will pause next update
  // (drain buffer first)
  if( willPause ){
    paused = true;
    willPause = false;
  }

  // skip if buffer is empty
  if( !buffer.length ){
    // send ACKs?
    if( sync && world.frame - sent > 10 ){
      exports.record(World.ACK);
    }
    return;
  }

  // skip if game is over?

  for(var i=0; i<buffer.length; i++){
    // execute each input on "game"
    execute(world,buffer[i]);

    // enqueue locally unless ACK
    sync && enqueue(queues.loc,world.frame,buffer[i])
  }

  if( sync ){
    // forward
    var to = Math.min(sync.world.frame, world.frame)
    forward(to) && replay()

    // send to network
    exports.emit('message',build(world.frame,buffer))

    // log/send hashes?
  }

  // reset buffer
  buffer.length = 0;
}

// should be called by a network "message" event
exports.onmessage = function(buf){
  debug('onmessage',buf.byteLength) // ab2s(buf)
  var inputs = parse(buf);
  var frame = inputs[0];
  for(var i=1; i<inputs.length; i++){
    enqueue(queues.net,frame,inputs[i])
  }
  // forward (on next update instead?)
  var to = Math.min(game.world.frame, frame);
  forward(to) && replay()
}

function validate(input){
  switch(input[0]){
    case World.MOVE: // index, x
      if( input.length == 3 )
        break;
    case World.ACK:
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
  debug('enqueue',frame,input)

  // skip ACKs
  // if( input[0] === World.ACK )
  //   return;

  // verify that the queue is in order (frame > last frame in queue)
  var first = queue[0];
  var last = queue[queue.length-2];
  if( frame < last ){
    throw new Error('cannot enqueue input too early')
  }

  queue.push(frame,input)
}

function dequeue(queue,world){
  // verify that the frame has not passed the first frame in queue
  if( queue[0] < world.frame ){
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
  debug('forward %s > %s',sync.world.frame,to)
  var a = sync.world.frame;
  for(var i=a; i<to; i++){
    dequeue(queues.loc,sync.world)
    dequeue(queues.net,sync.world)
    sync.update()
  }

  // while debugging
  sync.render()

  // replay if frame changed
  var willReplay = a < sync.world.frame;

  // if round/game is over, don't replay
  if( sync.world.state !== World.PLAYING )
    willReplay = false;

  // if round/game is over, don't replay
  if( game.world.state !== World.PLAYING )
    willReplay = false;

  debug('forward end %s', willReplay ? '(will replay)' : '')

  // return true (thus replay) if it actually moved forward
  return willReplay;
}

function replay(){
  debug('replay %s > %s',sync.world.frame,game.world.frame)
  var a = sync.world.frame;
  var b = game.world.frame;

  // copy "sync" to "game"
  game.world.copy(sync.world);

  // verify that the copy worked (hashCode)
  verify(game.world,sync.world)

  // sounds? start/end events?

  // use a copy of the queues
  var loc = queues.loc.slice();
  var net = queues.net.slice();

  // execute and update
  replaying = true;
  for(var i=a; i<b; i++){
    dequeue(loc,game.world)
    dequeue(net,game.world)
    game.update()
  }
  replaying = false;
  debug('replay end')
}

function execute(world,input){
  debug('execute %s %s',world.name,world.frame,input)
  switch(input[0]){
    case World.ACK:   return;
    case World.MOVE:  return actions.movePaddle(world,input[1],input[2]);
    case World.PLAY:  return actions.gameResume(world);
    case World.PAUSE: return actions.gamePause(world);
    case World.OVER:  return actions.gameOver(world);
  }
}


function build(frame,inputs){
  debug('build',frame,inputs.join(','))
  var dat = new Writer(buildBuf);
  dat.setUint16(sequence++);
  dat.setUint16(frame);
  for(var i=0; i<inputs.length;) {
    var input = inputs[i++];
    switch(input[0]){
      case World.MOVE:
        // console.log(' type:',input[0])
        // console.log(' id:',input[1])
        // console.log(' x:',input[2])
        dat.setInt8(input[0]);    // type
        dat.setUint8(input[1]);   // id
        dat.setFloat32(input[2]); // x
        break;
      case World.ACK:
      case World.PAUSE:
      case World.PLAY:
      case World.OVER:
        // console.log(' type:',input[0])
        dat.setInt8(input[0]);    // type
        break;
    }
  }

  // save for ACKs
  sent = frame;

  // return the written part of the buildBuf.
  return buildBuf.slice(0,dat.offset);
}


// make an Array [frame,inputs...]
function parse(buf){
  debug('parse')
  var arr = [];
  var dat = new Reader(buf);
  var seq = dat.getUint16()
  arr.push(dat.getUint16()) // frame

  // verify sequence
  verifySequence(seq);

  while(dat.offset < buf.byteLength){
    var input = []
      , type = dat.getInt8();
    switch(type){
      case World.ACK:
      case World.PLAY:
      case World.PAUSE:
      case World.OVER: // type
        input.push(type)
        break;
      case World.MOVE: // type, id, x
        input.push(type,dat.getUint8(),dat.getFloat32())
        break;
    }
    arr.push(input);
  }
  return arr;
}

// a, b = world
function verify(a,b){
  debug('verify')
  if( a.code() !== b.code() ){
    throw new Error('hash codes does not match');
  }
}

// checks if last message sequence was
// more than 1 frame away = DROPPED!
function verifySequence(seq){
  if( Math.abs(lastSeq-seq) > 1 ){
    // most likely caused by a reset, ignoring
    if( seq == 0 || lastSeq == 0 ){
      console.warn('valid dropped packet? %s > %s',lastSeq,seq);
      lastSeq = seq;
      return;
    } else {
      throw new Error('dropped packets. game will lose sync.')
    }
  }
  lastSeq = seq;
}