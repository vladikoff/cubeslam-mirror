// based on https://github.com/webRTC/webrtc.io-client

var Emitter = require('emitter')
  , WebSocketSignal = require('./web-socket-signal')
  , AppChannelSignal = require('./app-channel-signal')
  , debug = { connection: require('debug')('rtc:connection'),
              channel: require('debug')('rtc:channel') };

// Fallbacks for vendor-specific variables until the spec is finalized.
var PeerConnection = window.webkitRTCPeerConnection
                  || window.mozRTCPeerConnection
                  || window.RTCPeerConnection;


var host = 'ec2-176-34-161-202.eu-west-1.compute.amazonaws.com:3478';
var stunhost = 'stun.l.google.com:19302';
exports.servers = { iceServers: [
  {url: 'stun:'+host},
  {url: 'turn:hello@'+host, credentials: 'xxx'}, // user is required
  // {url: 'stun:stun.l.google.com:19302'}
]}

exports.available = (function(){
  try {
    if( typeof PeerConnection == 'function'
        && typeof PeerConnection.prototype.createDataChannel == 'function' ){
      var pc = new PeerConnection(null,{optional: [{RtpDataChannels: true}]});
      pc.createDataChannel('feat',{reliable:false})
    }
  } catch(e){
    return false;
  }
  return true;
})()

exports.connect = function(opts){
  opts = opts || {};
  opts.dataChannels = opts.dataChannels || false;
  opts.connectionTimeout = opts.connectionTimeout || 30000;

  var rtc = Emitter({})
    , channels = rtc.channels = {}
    , connection
    , signal;

  // default to appchannel signal
  if( opts.signal == 'ws' ){
    signal = rtc.signal = new WebSocketSignal(opts)
  } else {
    signal = rtc.signal = new AppChannelSignal(opts)
  }

  signal.on('open',function(){
    if( connection ) rtc.close()
    connection = createConnection();
    createDataChannels();
  })
  signal.on('turn',function(data) {
    exports.servers.iceServers = [
      {url: 'stun:' + stunhost},
      {url: data.url, credential: data.credential}
    ]
    // reconnecting if turn servers exist
    connection = createConnection();
    createDataChannels();
  })
  signal.on('offer',function(desc){
    connection.setRemoteDescription(desc);
    connection.createAnswer(onLocalDescriptionAndSend);
  })
  signal.on('answer',function(desc){
    connection.setRemoteDescription(desc);
  })
  signal.on('candidate',function(candidate){
    if (!connection.remoteDescription) {
      console.warn('ICE candidate: too soon?')
    } else {
      connection.addIceCandidate(candidate);
    }
  })
  signal.on('connected',function(){
    // A peer has arrived
    rtc.emit('connected')
  })
  signal.on('disconnected',function(){
    // A peer has left
    rtc.emit('disconnected')
  })
  signal.on('event',function(evt){
    var type = evt.type;
    delete evt.type;
    rtc.emit(type,evt);
  })
  signal.on('error',function(evt){
    rtc.emit('error',evt)
  })

  function createConnection(){
    debug.connection('create')
    var config = {optional: [{RtpDataChannels: !!opts.dataChannels}]};
    var connection = new PeerConnection(exports.servers,config)
    var timeout;
    connection.onconnecting = function(e){
      debug.connection('connecting',arguments)
      rtc.emit('connecting',e)
    }
    connection.onopen = function(e){
      clearTimeout(timeout);
      debug.connection('open',arguments)
      rtc.emit('open',e)
    }
    connection.onclose = function(e){
      debug.connection('close',arguments)
      rtc.emit('close',e)
    }
    connection.onaddstream = function(e){
      debug.connection('addstream',arguments)
      rtc.emit('addstream',e)
    }
    connection.onremovestream = function(e){
      debug.connection('removestream',arguments)
      rtc.emit('removestream',e)
    }
    connection.ondatachannel = function(e){
      debug.connection('datachannel',arguments)
      channel = setDataChannelListeners(e.channel);
      rtc.emit('datachannel',e)
    }
    connection.ongatheringchange = function(e){
      debug.connection('gatheringchange',arguments)
      rtc.emit('gatheringchange',e)
    }
    connection.onicecandidate = function(e){
      debug.connection('icecandidate %s',opts.bufferCandidates ? '(buffered)' : '',arguments)
      if( e.candidate ){
        signal.send(e.candidate)
      } else {
        debug.connection('icecandidate end %s',opts.bufferCandidates ? '(buffered)' : '')
        signal.send({candidate:null})
      }
      rtc.emit('icecandidate',e)

      // timeout if peer connection hasn't been established
      // in 30s after the last candidate
      clearTimeout(timeout);
      timeout = setTimeout(function(){
        rtc.emit('error',new Error('connection timed out after all candidates has been sent'));
      },opts.connectionTimeout)
    }
    connection.onicechange = function(e){
      debug.connection('icechange',arguments)
      rtc.emit('icechange',e)
    }
    connection.onidentityresult = function(e){
      debug.connection('identityresult',arguments)
      rtc.emit('identityresult',e)
    }
    connection.onnegotiationneeded = function(e){
      debug.connection('negotiationneeded',arguments)
      rtc.emit('negotiationneeded',e)
    }
    connection.onstatechange = function(e){
      debug.connection('statechange -> %s',connection.readyState,arguments)
      rtc.emit('statechange',e)
    }

    return connection;
  }

  function createDataChannels() {
    if( opts.dataChannels ){
      var labels = typeof opts.dataChannels == 'string'
        ? [opts.dataChannels]
        : opts.dataChannels;
      for(var i=0; i<labels.length; i++){
        var label = labels[i];
        channels[label] = createDataChannel(label);
      }
    }
  }

  function createDataChannel(label){
    debug.channel('create',label);
    var channel;
    try {
      // Reliable Data Channels not yet supported in Chrome
      // Data Channel api supported from Chrome M25.
      // You need to start chrome with  --enable-data-channels flag.
      channel = connection.createDataChannel(label,{reliable: false});
    } catch (e) {
      alert('Failed to create data channel. ' +
            'You need Chrome M25 or later with --enable-data-channels flag');
      console.error('Create Data channel failed with exception: ' + e.message);
    }
    return setDataChannelListeners(channel);
  }

  function closeDataChannel(label){
    var channel = channels[label];
    if( channel.readyState != 'closed' )
      channel.close();
    channel.onmessage = null;
    channel.onopen = null;
    channel.onclose = null;
    delete channels[label];
  }

  function setDataChannelListeners(channel){
    if( channel ){
      debug.channel('adding listeners',channel.label)
      channel.onmessage = function(e){
        debug.channel('message %s',channel.label,e)
        rtc.emit('channel message',e)
        rtc.emit('channel '+channel.label+' message',e)
      }
      channel.onopen = function(e){
        debug.channel('open %s',channel.label)
        rtc.emit('channel open',e)
        rtc.emit('channel '+channel.label+' open',e)
      }
      channel.onclose = function(e){
        debug.channel('close %s',channel.label)
        rtc.emit('channel close',e)
        rtc.emit('channel '+channel.label+' close',e)
      }
    }
    return channel;
  }

  var sendOffer = function(){
    debug.connection('send offer')
    connection.createOffer(onLocalDescriptionAndSend);
  }

  var onDescError = function(src){
    return function(err){ console.warn('could not set %s description',src,err) }
  }

  var onLocalDescriptionAndSend = function(desc){
    debug.connection('local description',desc)
    connection.setLocalDescription(desc)
    signal.send(desc)
  }

  rtc.addStream = function(stream){
    debug.connection('adding local stream')
    connection.addStream(stream);
    return this;
  }

  rtc.reconnect = function(){
    debug.connection('reconnect')
    if( connection ) rtc.close()
    connection = createConnection();
    createDataChannels();
    return this;
  }

  rtc.close = function(){
    debug.connection('close')

    var labels = Object.keys(channels);
    labels.forEach(closeDataChannel)

    if( connection ){
      if( connection.readyState != 'closed' )
        connection.close()
      connection.onconnecting = null;
      connection.onopen = null;
      connection.onclose = null;
      connection.onaddstream = null;
      connection.onremovestream = null;
      connection.ondatachannel = null;
      connection.ongatheringchange = null;
      connection.onicecandidate = null;
      connection.onicechange = null;
      connection.onidentityresult = null;
      connection.onnegotiationneeded = null;
      connection.onstatechange = null;
      connection = null;
    }
    signal.send('close')
  }

  rtc.send = function(label,data){
    debug.channel('send',label,data)
    var channel = channels[label];
    if( channel ){
      if( channel.readyState == 'open' ){
        channel.send(data);
      } else {
        console.warn('tried to send data on a not open channel %s',label)
      }
    } else {
      console.error('tried to send to non-existing channel %s',label);
    }
  }

  rtc.start = function(){
    debug.connection('start')
    sendOffer()
  }

  return rtc;
}
