// based on https://github.com/webRTC/webrtc.io-client

var Emitter = require('emitter')
  , debug = { connection: require('debug')('rtc:connection'),
              channel: require('debug')('rtc:channel') };

// Fallbacks for vendor-specific variables until the spec is finalized.
var PeerConnection = window.PeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection
  , URL = window.URL || window.webkitURL || window.msURL || window.oURL
  , getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

exports.configuration = { iceServers: [{url: 'stun:stun.l.google.com:19302'}] };
exports.connect = function(token,room,clientId){
  debug.channel('token: %s', token)
  debug.channel('room: %s', room)
  debug.channel('clientId: %s', clientId)
  var rtc = Emitter({})
    , channel = rtc.channel = new goog.appengine.Channel(token)
    , socket = rtc.socket = channel.open()
    , connection // set in rtc.reconnect()
    , opened = false
    , buffer = [];

  socket.onopen = function(){
    debug.channel('open',arguments)
    opened = true
    socket.send('join')

    while( buffer.length ){
      var args = buffer.shift();
      socket.send.apply(socket,args);
    }

  }
  socket.onerror = function(e){
    debug.channel('error',arguments)
    console.error('rtc socket error',arguments)
    rtc.emit('error',e)
  }
  socket.onmessage = function(msg){
    var json = JSON.parse(msg.data);

    // redundant...
    // debug.channel('message',msg.data)
    switch(json.Type){
      // another user connected to the room (data=peer)
      case 'connected':
        debug.channel('connected user',json.Data)
        rtc.reconnect()
        socket.peer = json.Data;
        sendOffer();
        rtc.emit('connect',json.Data);
        break;

      case 'disconnected':
        debug.channel('disconnected user',json.Data)
        if( json.Data === socket.peer ){ // ignore own disconnect
          rtc.emit('disconnect',json.Data);
          delete socket.peer;
        }
        break;

      // received an offer (data=offer)
      case 'offer':
        socket.peer = json.From
        var offer = JSON.parse(json.Data)
          , desc = new RTCSessionDescription(offer);
        debug.channel('offer',offer)
        connection.setRemoteDescription(desc,null,onDescError('remote offer'));
        sendAnswer()
        break;

      // received an answer (data=sdp)
      case 'answer':
        var answer = JSON.parse(json.Data)
          , desc = new RTCSessionDescription(answer);
        debug.channel('answer',answer)
        connection.setRemoteDescription(desc,null,onDescError('remote answer'));
        break;

      // received a candidate (data={candidate,sdpMid,sdpMLineIndex})
      case 'icecandidate':
        var cands = JSON.parse(json.Data)
        debug.channel('icecandidate',cands)
        try {
          for(var i=0; i < cands.length; i++ ){
            var candidate = new RTCIceCandidate(cands[i]);
            connection.addIceCandidate(candidate);
          }
        } catch(e) {
          console.log('iceState: %s',connection.iceState)
          console.warn('got an icecandidate too early',json.Data,e)
        }
        break;

      case 'event':
        debug.channel('client event',json.Type,json.Data)
        var evt = JSON.parse(json.Data);
        rtc.emit.apply(rtc,[evt.type].concat(evt.args))
        break

      default:
        debug.channel('server event',json.Type,json.Data)
        rtc.emit(json.Type,json.Data);

    }
  }
  socket.onclose = function(){
    debug.channel('close')
    rtc.emit('disconnect',socket.peer)
    delete socket.peer;
    opened = false;
  }

  /*
  Message{
    Room: 'room',
    To: null/'peer',
    From: 'client',
    Type: "event"/"join"/"leave"/"offer"/"answer"/"icecandidate",
    Data: '{"type":"offer","sdp":"xyz"}'
  }
  */
  socket.send = function(type,to,data){
    to = data ? to : '';
    if( !opened ){
      debug.channel('send (BUFFERED) "%s" => "%s"',type,to,data)
      return buffer.push(arguments);
    }
    var msg = {
      Room: room,
      To: to,
      From: clientId,
      Type: type,
      Data: JSON.stringify(data || to)
    };
    var req = new XMLHttpRequest()
    req.onerror = this.onerror.bind(this)
    req.open('POST', '/message', true)
    req.setRequestHeader('Content-Type','application/json')
    req.send(JSON.stringify(msg))
    debug.channel('send "%s" => %s',type,to,data)
  }

  socket.emit = function(type){
    var args = [].slice.call(arguments,1);
    debug.channel('emitting "%s"',type,arguments,args)
    socket.send('event','',{type:type,args:args})
  }

  function createConnection(){
    var connection = rtc.connection = new PeerConnection(exports.configuration)
    connection.onconnecting = function(e){
      debug.connection('connecting',arguments)
      rtc.emit('connecting',e)
    }
    connection.onopen = function(e){
      debug.connection('open',arguments)
      for(var i=0; i < streams.length; i++ )
        connection.addStream(streams[i]);
      rtc.emit('open',e)
    }
    connection.onclose = function(e){
      debug.connection('close',arguments)
      socket.send('leave',rtc.clientId)
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
      rtc.emit('datachannel',e)
    }
    connection.ongatheringchange = function(e){
      debug.connection('gatheringchange',arguments)
      rtc.emit('gatheringchange',e)
    }
    var icecandidates = null;
    connection.onicecandidate = function(e){
      if( e.candidate && socket.peer ){
        debug.connection('icecandidate (buffered)',arguments)
        icecandidates = icecandidates || []
        icecandidates.push({
          candidate: e.candidate.candidate,
          sdpMid: e.candidate.sdpMid,
          sdpMLineIndex: e.candidate.sdpMLineIndex
        })
      } else if( socket.peer ){
        debug.connection('end of icecandidates')
        socket.send('icecandidate',socket.peer,icecandidates)
        icecandidates = null;
      } else {
        console.warn('unexpected icecandidate (not yet connected)',e)
      }
      // if( e.candidate && socket.peer ){
      //   debug.connection('icecandidate',arguments)
      //   socket.send('icecandidate',socket.peer,{
      //     candidate: e.candidate.candidate,
      //     sdpMid: e.candidate.sdpMid,
      //     sdpMLineIndex: e.candidate.sdpMLineIndex
      //   })
      // } else if( socket.peer ){
      //   debug.connection('end of icecandidates')
      // } else {
      //   console.warn('unexpected icecandidate (not yet connected)',e)
      // }
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
      sendOffer();
      rtc.emit('negotiationneeded',e)
    }
    connection.onstatechange = function(e){
      debug.connection('statechange -> %s',connection.readyState,arguments)
      rtc.emit('statechange',e)
    }
    return connection;
  }
  // using a sync xhr request to make sure
  // the client gets disconnected. because
  // using AppEngine channel doesn't work.
  var unload = window.onbeforeunload;
  window.onbeforeunload = function(e){
    if( typeof unload == 'function' )
      unload.call(this,e);
    var req = new XMLHttpRequest();
    req.open('POST', '/disconnect', false);
    req.setRequestHeader('Content-Type','application/x-www-form-urlencoded')
    req.send('from='+clientId+'@'+room);
  }

  var onDescError = function(src){
    return function(err){ console.warn('could not set %s description',src,err) }
  }

  var sendOffer = function(){
    if( socket.peer ){
      debug.connection('sending offer (readystate:%s)',connection.readyState)
      connection.createOffer(function(offer){
        connection.setLocalDescription(offer,null,onDescError('local offer'));
        socket.send('offer',socket.peer,offer)
      })
    } else {
      debug.connection('not sending offer, not connected (readystate:%s)',connection.readyState)
    }
  }
  var sendAnswer = function(){
    if( socket.peer ){
      // TODO check that we're not already waiting for one?
      debug.connection('sending answer (readystate:%s)',connection.readyState)
      connection.createAnswer(function(answer){
        connection.setLocalDescription(answer,null,onDescError('local answer'));
        socket.send('answer',socket.peer,answer)
      })
    } else {
      debug.connection('not sending answer (readystate:%s)',connection.readyState)
    }
  }

  // private methods while testing
  rtc._sendOffer = sendOffer;
  rtc._sendAnswer = sendAnswer;

  var streams = []
  rtc.addStream = function(stream){
    debug.connection('adding local stream')
    connection.addStream(stream);
    streams.push(stream);
    return this;
  }

  rtc.reconnect = function(){
    debug.connection('reconnect')
    if( connection && connection.readyState != 'closed' )
      connection.close()
    connection = createConnection();
    return this;
  }

  return rtc.reconnect();
}
