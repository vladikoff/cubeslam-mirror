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
  , diff = require('./support/diff')
  , Writer = require('./support/buffer').Writer
  , Reader = require('./support/buffer').Reader
  , vec = require('geom').vec
  , dmaf = require('./dmaf.min');

var buffer = [];
var buildBuf = new ArrayBuffer(1024); // pre-allocated buffer
var sequence = 0;
var lastSeq = 0;
var sync, game;
var queues = {loc:[], net:[]};
var replaying = false;
var forwarding = false;
var paused = true;
var willPause = false;
var sendbuf = [];
var sendlen = 0;
var latency = 0;
var framerate = 1000/60;
var temp = new World('temp'); // used for replay, keeps the "before" states of puck and paddles
var ack = 0;

// shortcuts
var join = [].join
  , slice = [].slice;

Emitter(exports);


// input types
exports.ACK = -1;
exports.MOVE = 0;
exports.START = 1;
exports.PLAY = 2;
exports.PAUSE = 3;
exports.ROUND_OVER = 4;
exports.GAME_OVER = 5;


// sets the "sync" and "game" variable
exports.context = function(ctx){
  debug('context',!!ctx.sync,!!ctx.game)
  sync = ctx.sync;
  game = ctx.game;
  wrapDMAF()
}

exports.latency = function(v){
  debug('latency',v)
  latency = v;
}

exports.reset = function(){
  debug('reset')
  queues.loc.length = 0
  queues.net.length = 0
  buffer.length = 0
  lastSeq = 0
  sequence = 0
  sendbuf.length = 0
  sendlen = 0
  ack = 0
}

// just returns some current input
// state information
exports.info = function(){
  return {
    ack: ack,
    paused: paused,
    willPause: willPause,
    replaying: replaying,
    forwarding: forwarding,
    sequence: sequence,
    lastSeq: lastSeq,
    latency: latency,
    recorded: buffer.length,
    sendbuf: sendbuf.length,
    sendlen: sendlen,
    qloc: queues.loc.length + ' ('+queues.loc[0]+')',
    qnet: queues.net.length + ' ('+queues.net[0]+')'
  }
}

// will pause after next update unless
// `now` is set to `true`. this is to
// make sure the current buffer will be
// drained first.
exports.pause = function(now){
  debug('pause %s',now ? '(now)' : '(next update)')
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
  debug('record %s', replaying ? '(replay)' : '', str(arguments))

  // skip while replaying (already enqueued)
  if( replaying ) return;

  // validate
  validate(arguments);

  // buffer
  buffer.push(slice.call(arguments));
}

// should be called by a game "update" event
exports.process = function(world){
  // debug('process',world.name,buffer.length)

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
    return;
  }

  // skip if game is over?

  // send to network first
  sync && send(build(world.frame,buffer))

  for(var i=0; i<buffer.length; i++){
    // execute each input on "game"
    execute(world,buffer[i]);

    // enqueue locally
    if( sync && buffer[i][0] !== exports.ACK )
      enqueue(queues.loc,world.frame,buffer[i])
  }

  if( sync ){
    // forward
    forward() && replay()
  }

  // reset buffer
  buffer.length = 0;
}

// should be called by a network "message" event
exports.onmessage = function(buf){
  debug('onmessage',buf.byteLength) // ab2s(buf)
  // expect multiple frames in one buf
  // buf: [len,msg...]
  var arr = new Uint8Array(buf);
  for(var offset=0; offset<arr.byteLength;){
    var len = arr[offset++];
    var msg = arr.buffer.slice(offset,offset+len);
    offset += len;

    var inputs = parse(msg);
    var frame = inputs[0];
    for(var i=1; i<inputs.length; i++){
      enqueue(queues.net,frame,inputs[i])
    }

    // ack is the last acknowledged frame
    // it's as far as we can forward and
    // know that we'll stay in sync
    ack = frame;
  }

  // forward
  forward() && replay()
}

function validate(input){
  switch(input[0]){
    case exports.MOVE: // index, x
      if( input.length == 3 )
        break;
    case exports.ACK:
    case exports.START:
    case exports.PLAY:
    case exports.PAUSE:
    case exports.RESUME:
    case exports.ROUND_OVER:
    case exports.GAME_OVER: // no args
      if( input.length == 1 )
        break;
    default:
      throw new Error('invalid input')
  }
}

function enqueue(queue,frame,input){
  debug('enqueue',frame,str(input))

  // verify that the queue is in order (frame > last frame in queue)
  var last = queue[queue.length-2];
  if( frame < last ){
    if( frame == 0 ){
      // attempt to reset the queues
      console.warn('received an input too early. but since frame==0 we reset()')
      exports.reset()
    } else {
      console.error('received an input too early. %s < %s', frame, last)
      alertOnce('received an input too early. determinism is not guaranteed. pausing inputs.')
      var err = new Error('cannot enqueue input too early')
      err.code = 1303;
      return exports.emit('error',err);
    }
  }

  queue.push(frame,input)
}

function dequeue(queue,world){
  // verify that the frame has not passed the first frame in queue
  if( queue[0] < world.frame ){
    console.error('cannot pass the first frame in queue. %s < %s', queue[0], world.frame)
    alertOnce('cannot pass the first frame in queue. determinism is not guaranteed. pausing inputs.')
    var err = new Error('cannot pass the first frame in queue')
    err.code = 1302;
    return exports.emit('error',err);
  }

  // execute inputs in queue matching the frame
  while(queue[0]===world.frame){
    var frame = queue.shift()
      , input = queue.shift();
    execute(world,input)
  }
}

function forward(to){
  var a = sync.world.frame
    , b = Math.min(ack,game.world.frame);

  debug('forward from %s',a)

  forwarding = true;
  for(var i=a; i<b; i++){
    dequeue(queues.loc,sync.world)
    dequeue(queues.net,sync.world)
    sync.update()
  }
  forwarding = false;

  // while debugging
  sync.render()

  // replay if frame changed
  var willReplay = a < sync.world.frame;

  // if round/game is over, don't replay
  if( sync.world.state !== World.PLAYING ){
    willReplay = false;
  }

  // if round/game is over, don't replay
  if( game.world.state !== World.PLAYING ){
    willReplay = false;
  }

  // notify of a pause if the sync and game frames are too
  // far apart. or one client will replay a lot every update
  // and thus be very jittery.
  var diff = Math.abs(sync.world.frame-game.world.frame);
  if( willReplay && diff > 60 ){
    console.warn('games are too far apart (%s frames). waiting until sync catches up.',diff)
    willReplay = false;
    // stop updateing game until sync catches up
    game.pause()
  } else if( game.paused ){
    willReplay = false;

    // start updating game again when caught up
    if( diff < 10 ){
      game.resume()
    }
  }

  debug('forward end %s', willReplay ? '(will replay)' : '')

  // return true (thus replay) if it actually moved forward
  return willReplay;
}

function replay(){
  debug('replay %s > %s',sync.world.frame,game.world.frame)
  var a = sync.world.frame;
  var b = game.world.frame;

  // keep a copy of the pucks and paddles
  // for interpolation
  temp.pucks.copy(game.world.pucks);
  temp.paddles.copy(game.world.paddles);

  // copy "sync" to "game"
  game.world.copy(sync.world);

  // verify that the copy worked (hashCode)
  // NOTE: commented out because it is HEAVY
  // verify(game.world,sync.world)

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

  // add interpolation between the temp
  // and the replayed world.
  interpolate(temp,game.world)

  debug('replay end')
}

function execute(world,input){
  debug('execute %s %s',world.name,world.frame,str(input))
  switch(input[0]){
    case exports.ACK:        return;
    case exports.MOVE:       return actions.movePaddle(world,input[1],input[2]);
    case exports.START:      return actions.gameStart(world);
    case exports.PLAY:       return actions.gamePlay(world);
    case exports.PAUSE:      return actions.gamePause(world);
    case exports.RESUME:     return actions.gameResume(world);
    case exports.ROUND_OVER: return actions.roundOver(world);
    case exports.GAME_OVER:  return actions.gameOver(world);
  }
}

function send(buf){
  debug('send',buf.byteLength)
  if( buf.byteLength > 255 ){
    throw new Error('invalid msg length: '+buf.byteLength);
  }
  sendbuf.push(new Uint8Array(buf))
  sendlen += buf.byteLength
}

// only emit this every at ~30fps
// buf = [len,msg...]
setInterval(function(){
  if( sendlen ){
    flush()
  } else if( sync && !paused ){
    exports.record(exports.ACK);
  }
},1000/30)

function flush(){
  if( !sendlen )
    return;

  debug('flush %s messages',sendbuf.length,sendlen)
  // TODO seq/message instead of seq/frame
  var buf = new Uint8Array(sendlen+sendbuf.length)
    , off = 0;
  while(sendbuf.length){
    var msg = sendbuf.shift();
    buf[off++] = msg.byteLength;
    buf.set(msg,off);
    off += msg.byteLength;
  }
  sendlen = 0;
  exports.emit('message',buf);
}


function build(frame,inputs){
  debug('build',frame,inputs.join(','))
  var dat = new Writer(buildBuf);
  dat.setUint16(sequence++);
  dat.setUint16(frame);
  for(var i=0; i<inputs.length;) {
    var input = inputs[i++];
    switch(input[0]){
      case exports.MOVE:
        // console.log(' type:',input[0])
        // console.log(' id:',input[1])
        // console.log(' x:',input[2])
        dat.setInt8(input[0]);    // type
        dat.setUint8(input[1]);   // id
        dat.setFloat32(input[2]); // x
        break;
      case exports.ACK:
      case exports.START:
      case exports.PAUSE:
      case exports.RESUME:
      case exports.PLAY:
      case exports.ROUND_OVER:
      case exports.GAME_OVER:
        // console.log(' type:',input[0])
        dat.setInt8(input[0]);    // type
        break;
    }
  }

  // return the written part of the buildBuf.
  return buildBuf.slice(0,dat.offset);
}


// make an Array [frame,inputs...]
// TODO perhaps Pool the input arrays?
function parse(buf){
  debug('parse',ab2s(buf.buffer || buf))
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
      case exports.ACK:
      case exports.PLAY:
      case exports.START:
      case exports.PAUSE:
      case exports.RESUME:
      case exports.ROUND_OVER:
      case exports.GAME_OVER: // type
        input.push(type)
        break;
      case exports.MOVE: // type, id, x
        input.push(type,dat.getUint8(),dat.getFloat32())
        break;
    }
    arr.push(input);
  }
  debug('parsed %s inputs at frame %s',arr.length-1,arr[0])
  return arr;
}

// a, b = world
function verify(a,b){
  debug('verify')
  if( a.code() !== b.code() ){

    var ja = JSON.stringify(a,unhide,2);
    var jb = JSON.stringify(b,unhide,2);
    console.log(diff.createPatch('diff for frame '+a.frame,ja,jb,'game','sync'))

    alertOnce('hash codes does not match after copy. determinism is not guaranteed.')

    var err = new Error('hash codes does not match');
    err.code = 1301;
    exports.emit('error',err)
  }
}

// used as JSON replacer to
// find undefined values and
// remove excluded keys
function unhide(k,v){
  if( ~World.EXCLUDED.indexOf(k) )
    return undefined;
  if( typeof v == 'undefined' )
    return 'undefined'
  return v;
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
      alertOnce('dropped packets. determinism is not guaranteed.')
      var err = new Error('dropped packets');
      err.code = 1304;
      exports.emit('error',err)
    }
  }
  lastSeq = seq;
}


function ab2s(buf){
  return join.call(new Uint8Array(buf));
}

function alertOnce(msg){
  if( !alertOnce['msg:'+msg] ){
    alertOnce['msg:'+msg] = true;
    alert(msg);
  }
}

/**
 * Adds properties to bodies `interpolate` object
 * which will be used in the integration to smooth
 * things about a bit between the two worlds.
 *
 * It should ignore interpolating if the difference is too
 * small.
 *
 *  ex.
 *
 *    {
 *      offset: vec.sub(before.current,after.current),
 *      step: 1/f, // ex 1/10 = .1
 *      frames: f   // ex 10 so
 *    }
 *
 *
 * @param {World} before The (temporary) world before the replay
 * @param {World} after The current world after the replay
 */
function interpolate(before, after){
  // calculate frames from latency
  // (ex. latency/fps, 100ms/(1000/60fps) = ~6 frames)
  var frames = Math.ceil(latency/framerate);

  // skip if less or equal (because of ceil) than a frame
  if( frames <= 1 ){
    // console.log('skipping interpolation (not enough frames: %s)',frames)
    return;
  }

  // interpolate pucks
  for(var i=0; i<after.pucks.length; i++){
    var a = after.pucks.values[i];
    if( before.pucks.has(a.index) ){
      interpolateBody(a,before.pucks.get(a.index),frames)
    }
  }

  // interpolate paddles
  for(var i=0; i<after.paddles.length; i++){
    var a = after.paddles.values[i];
    if( before.paddles.has(a.index) ){
      interpolateBody(a,before.paddles.get(a.index),frames)
    }
  }
}

// applies the interpolation to a single body
function interpolateBody(a,b,f){
  var i = a.interpolate;

  // skip if it already has interpolation
  // TODO should we re-create instead and make
  //      sure we free the old ones first?
  if( i.frames ){
    // vec.free(i.offset)
    return;
  }

  // skip if distance is too large
  // TODO setting?
  var maxDist = 100
    , minDist = 1
    , dist = vec.distSq(a.current,b.current);
  if( dist < minDist*minDist || dist > maxDist*maxDist ){
    // console.log('skipping interpolation for %s (dist: %s)',a.index,Math.sqrt(dist))
    return;
  }

  i.offset = vec.sub(a.current,b.current);
  i.step = 1/f;
  i.frames = f;

  // no need to free, it will be freed when done
}


// hack dmaf.tell to not make sounds during
// replay or for the sync game to avoid double
// sounds
function wrapDMAF(){
  if( !dmaf || dmaf.tell.wrapped )
    return;
  var tell = dmaf.tell;
  dmaf.tell = function(){
    if( replaying || forwarding ) return;
    tell.apply(dmaf,arguments);
  };
  tell.wrapped = true;
}



function str(input){
  switch(input[0]){
    case exports.ACK:        return 'ACK';
    case exports.MOVE:       return 'MOVE('+input[1]+','+input[2]+')';
    case exports.START:      return 'START';
    case exports.PLAY:       return 'PLAY';
    case exports.PAUSE:      return 'PAUSE';
    case exports.RESUME:     return 'RESUME';
    case exports.ROUND_OVER: return 'ROUND OVER';
    case exports.GAME_OVER:  return 'GAME OVER';
    default:
      // assumes the input is an array of inputs
      if( Array.isArray(input) ){
        return input.map(str).join(' | ')
      } else {
        return 'invalid input!'
      }
  }
}