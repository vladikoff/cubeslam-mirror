// based on https://github.com/webRTC/webrtc.io-client

var Emitter = require('emitter')
  , debug = { connection: require('debug')('rtc:connection'),
              signal: require('debug')('rtc:signal'),
              channel: require('debug')('rtc:channel') };

// Fallbacks for vendor-specific variables until the spec is finalized.
var PeerConnection = window.RTCPeerConnection
  || window.webkitRTCPeerConnection
  || window.mozRTCPeerConnection;


var host = 'ec2-176-34-161-202.eu-west-1.compute.amazonaws.com:3478';
exports.servers = { iceServers: [
  {url: 'stun:'+host},
  {url: 'turn:hello@'+host, credentials: 'xxx'}, // user is required
//{url: 'stun:stun.l.google.com:19302'}
]}

exports.available = (function(){
  return PeerConnection !== undefined
      && PeerConnection.prototype.createDataChannel === 'function'
})()

exports.connect = function(opts){
  opts = opts || {};
  opts.dataChannels = opts.dataChannels || false;

  var rtc = Emitter({})
    , signal = rtc.signal = new WebSocketSignal(opts)
    , connection
    , channels = rtc.channels = {};

  signal.on('open',function(){
    if( connection ) rtc.close()
    connection = createConnection();
    if( opts.dataChannels ){
      var labels = typeof opts.dataChannels == 'string'
        ? [opts.dataChannels]
        : opts.dataChannels;
      for(var i=0; i<labels.length; i++){
        var label = labels[i];
        channels[label] = createDataChannel(label);
      }
    }
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

  function createConnection(){
    debug.connection('create')
    var config = {optional: [{RtpDataChannels: !!opts.dataChannels}]};
    var connection = new PeerConnection(exports.servers,config)
    connection.onconnecting = function(e){
      debug.connection('connecting',arguments)
      rtc.emit('connecting',e)
    }
    connection.onopen = function(e){
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
      debug.connection('icecandidate',arguments)
      if( e.candidate )
        signal.send(e.candidate)
      else
        debug.connection('icecandidate end')
      rtc.emit('icecandidate',e)
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
    if( channel )
      channel.send(data);
    else
      console.error('tried to send to non-existing channel %s',label);
  }

  rtc.start = function(){
    debug.connection('start')
    sendOffer()
  }

  return rtc;
}





/**
 * The WebSocketSignal expects to connect
 * to a simple relay server.
 *
 * ex: https://gist.github.com/4547040#file-relay-js
 */
function WebSocketSignal(opts){
  opts = opts || {};
  opts.url = opts.url || 'ws://localhost:8080/test';
  opts.timeout = opts.timeout || 5000;
  opts.retryTimeout = opts.retryTimeout || 500;
  opts.maxAttempts = opts.maxAttempts || 5;
  var retryTimeout = opts.retryTimeout;
  var retryAttempts = 0;
  var signal = Emitter({});

  function create(){
    debug.signal('create')

    retryTimeout *= 2;
    retryAttempts++;
    if( retryAttempts >= opts.maxAttempts )
      return console.error('tried to connect to %s %s times without success. giving up.',opts.url,retryAttempts)

    var ws = new WebSocket(opts.url)
      , connected = null;

    ws.onopen = function(){
      debug.signal('open')
      signal.emit('open') // create the peer connection here
      clearTimeout(ws.timeout)
    }

    ws.onmessage = function(m){
      // reset retry timeout on first message
      retryTimeout = opts.retryTimeout;
      retryAttempts = 0;

      var json = JSON.parse(m.data);
      if( json && json.type == 'offer' ){
        debug.signal('offer',json)
        signal.emit('offer',new RTCSessionDescription(json))

      } else if( json && json.type == 'answer' ){
        debug.signal('answer',json)
        signal.emit('answer',new RTCSessionDescription(json))

      } else if( json && json.type == 'close' ){
        debug.signal('close')
        signal.emit('close');

      } else if( json && json.candidate ){
        debug.signal('candidate',[json])
        signal.emit('candidate',new RTCIceCandidate(json))

      } else if( json && json.a && json.b ){
        if( !connected ){
          connected = true;
          debug.signal('connected')
          signal.emit('connected') // from peer
        }

      } else if( json && ((json.a && !json.b) || (json.b && !json.a)) ){
        if( connected === true ){
          connected = false;
          debug.signal('disconnected')
          signal.emit('disconnected') // from peer
        }

      } else if( json ){
        debug.signal('message',m.data)
        if( json.type ){
          signal.emit('event',json)
        }
      } else {
        console.warn('invalid json',json)
      }
    }

    ws.onerror = function(e){
      console.error('WS error: ',e)
    }

    ws.onclose = function(){
      debug.signal('closed (retrying in %sms)',retryTimeout)
      signal.emit('close');
      clearTimeout(ws.timeout)
      ws.timeout = setTimeout(create,retryTimeout)
    }

    clearTimeout(ws.timeout)
    ws.timeout = setTimeout(function(e){
      debug.signal('timed out (retrying in %sms)',retryTimeout)
      clearTimeout(ws.timeout)
      ws.timeout = setTimeout(create,retryTimeout)
    },opts.timeout)

    signal.send = function(msg){
      debug.signal('send',msg)
      if( ws.readyState == ws.OPEN ){
        if( typeof msg == 'string' )
          msg = JSON.stringify({type:msg});
        else
          msg = JSON.stringify(msg)
        ws.send(msg)
      } else {
        console.error('attempted to send a message to early, waiting for open')
        signal.on('open',signal.send.bind(signal,msg))
      }
    }

    return signal;
  }
  return create();
}