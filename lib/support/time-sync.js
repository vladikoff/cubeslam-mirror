var debug = require('debug')('time-sync')
  , Emitter = require('emitter')
  , latency = require('latency')
  , now = require('now');

/**
  This lib assumes that a PeerConnection has been
  set up between two clients.

  It works by using `DataChannel#send` to send a series
  of sync requests (of which the local time has been stored)
  and listening for sync replies and then calculates a
  latency based on median-stddev.

  Based on http://www.gamedev.net/page/resources/_/technical/multiplayer-and-network-programming/clock-synchronization-of-client-programs-r2493

    // uses DataChannel to synchronize the time
    // of 2 clients, very useful for a realtime
    // multiplayer game like "chrome pong"
    var TimeSync = require('time-sync')
      , sync = new TimeSync(dataChannel);

    // will be called for both host and guest when
    // the total latency has been calculated
    sync.on('done',function(){
      // now set game clock to 0 + this.latency
    }).start()
*/

module.exports = TimeSync;

function TimeSync(channel){
  if( !(this instanceof TimeSync) ){
    return new TimeSync(channel);
  }
  this.channel = channel;
  this.times = [];
  this.received = 0;
  this.index = 0;
  this.wanted = 32;
  this.requestTimes = {};
  this.timeout = 10000;
  this.interval = 160;
}

Emitter(TimeSync.prototype);

TimeSync.prototype.onmessage = function(msg){
  // wrap in typed array
  msg = new Uint8Array(msg);

  // check for REQUEST
  if( is(REQ,msg) ){
    var index = parse(msg)
    debug('got REQUEST',index)
    this.channel.send(write(REP,index))
    this.emit('request',index)
    return true;

  // check for REPLY
  } else if( is(REP,msg) ){
    var index = parse(msg)

    // we good, it's one of ours
    var requestTime = this.requestTimes[index]
    if( this.requesting && requestTime ){
      var replyTime = now()
      debug('got REPLY %sms',replyTime-requestTime,index)
      this.received++;
      this.times[index % this.wanted] = (replyTime-requestTime)/2;
      delete this.requestTimes[index]
      this.emit('reply',index)
    }
    return true;

  // check for DONE
  } else if( is(DON,msg) ){
    if( !this.requesting ){
      this.latency = parse(msg)
      debug('got DONE',this.latency)
      this.emit('done',this.latency,false)
    } else {
      console.warn('unexpected DONE')
    }
    return true;

  }
  // not a TimeSync message!
  return false;
}

TimeSync.prototype.start = function(){
  debug('start');

  if( this.requesting ){
    return console.warn('ignoring time sync start because already running')
  }

  if( !this.channel ){
    return console.warn('ignoring time sync start because missing data channel')
  }

  this.times.length = 0 // clear array
  this.index = Math.round(Math.random()*10000)
  this.update(this.wanted)
}

TimeSync.prototype.update = function(n){
  debug('update',n)
  this.requesting = true
  // send a request every 30ms until we have received
  // enough replies.
  this.received = 0;
  this._interval = setInterval(function(){
    // if we have enough request/replies we're done
    if( this.requesting && this.received >= n ){
      this.done()

    // or we keep sending requests
    } else if( this.requesting ){
      this.request()

    // or stop it
    } else {
      this.stop()
    }
  }.bind(this),this.interval)

  this._timeout = setTimeout(function(){
    debug('timed out')
    this.stop()
    this.emit('timeout')
  }.bind(this),this.timeout)
}

TimeSync.prototype.request = function(){
  var requestIndex = this.index
  this.requestTimes[requestIndex] = now()
  this.channel.send(write(REQ,requestIndex))
  debug('sent REQUEST',requestIndex,this.times.length === 0 ? 'initial' : '')
  this.index++
}

TimeSync.prototype.stop = function(){
  // cancel the rest of the requests
  clearInterval(this._interval)
  clearTimeout(this._timeout)
  this.requesting = false
}

TimeSync.prototype.done = function(){
  this.stop()
  this.latency = Math.round(calculateLatency(this.times)) // rounded because of 16bit int
  this.channel.send(write(DON,this.latency))
  debug('sent DONE',this.latency)
  this.emit('done',this.latency,true)
}

// calculate the latency from an array of "midway-latencies"
function calculateLatency(times){
  return latency(times);
}

var PREFIX = ['T'.charCodeAt(0),'S'.charCodeAt(0)];

// REQ is a prebuilt buffer with:
//  - a time-sync prefix (TS)
//  - the REQUEST type (0)
//  - and room for a 16bit index
var REQ = new Uint8Array(PREFIX.concat(0,0,0))

// REP is a prebuilt buffer with:
//  - a time-sync prefix (TS)
//  - the REPLY type (1)
//  - and room for a 16bit index
var REP = new Uint8Array(PREFIX.concat(1,0,0))

// DON is a prebuilt buffer with:
//  - a time-sync prefix (TS)
//  - the DONE type (2)
//  - and room for a 16bit latency
var DON = new Uint8Array(PREFIX.concat(2,0,0))

function write(buf,index){
  buf[3] = (index >> 8) & 0xff
  buf[4] = (index >> 0) & 0xff
  return buf;
}
function parse(buf){
  return (buf[3] << 8) + buf[4];
}
function is(buf,msg){
  return buf.byteLength === msg.byteLength
      && buf[0] === msg[0]
      && buf[1] === msg[1]
      && buf[2] === msg[2];
}