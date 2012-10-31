// based on https://github.com/webRTC/webrtc.io-client

var Emitter = require('emitter')
  , debug = { connection: require('debug')('rtc:connection'),
              channel: require('debug')('rtc:channel') };

// Fallbacks for vendor-specific variables until the spec is finalized.
var PeerConnection = window.PeerConnection || window.webkitRTCPeerConnection;
var URL = window.URL || window.webkitURL || window.msURL || window.oURL;
var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

exports.connections = [];
exports.configuration = null; //{ iceServers: [{url: 'STUN stun.l.google.com:19302'}] };
exports.connect = function(token,room){
  var rtc = Emitter({})
    , channel = rtc.channel = new goog.appengine.Channel(token)
    , socket = rtc.socket = channel.open()
    , connection = rtc.connection = new PeerConnection(exports.configuration);

  // some public access to all connections
  this.connections.push(rtc);

  socket.onopen = function(){
    debug.channel('open',arguments)
    rtc.clientId = this.applicationKey_
    this.send('join',room)
  }
  socket.onmessage = function(msg){
    var json = JSON.parse(msg.data)
      , type = json.Type
      , data = json.Data;

    // redundant...
    // debug.channel('message',msg.data)
    switch(type){
      // another user connected to the room (data=peer)
      case 'connected': 
        debug.channel('connected user',data)
        socket.peer = data;
        sendOffer();
        break;

      case 'disconnected':
        debug.channel('disconnected user',data)
        rtc.emit('disconnect',this.peer)
        break;

      // received an offer (data=[peer,sdp])
      case 'offer': 
        debug.channel('offer',data)
        socket.peer = data[0]
        var desc = new RTCSessionDescription({type: 'offer', sdp: data[1]});
        connection.setRemoteDescription(desc);
        sendAnswer();
        break;

      // received an answer (data=sdp)
      case 'answer': 
        debug.channel('answer',data)
        var desc = new RTCSessionDescription({type: 'answer', sdp: data});
        connection.setRemoteDescription(desc);
        break;

      // received a candidate (data=[candidate,sdpMid,sdpMLineIndex])
      case 'icecandidate': 
        debug.channel('icecandidate',data)
        try {
          var candidate = new RTCIceCandidate({
            candidate: data[0],
            sdpMid: data[1],
            sdpMLineIndex: data[2]
          })
          connection.addIceCandidate(candidate);
        } catch(e){
          console.warn('got an icecandidate too early',e)
        }
        break;

      default:
        debug.channel('event',type,data)
        rtc.emit(type,data);

    }
  }
  socket.onclose = function(){
    debug.channel('close')
    rtc.emit('disconnect',this.peer)
  }
  socket._send = socket.send;
  socket.send = function(type,data){
    debug.channel('send "%s"',type,data)
    var msg = {'Type':type,'Data':data};
    this._send(JSON.stringify(msg))
  }

  var sendOffer = function(){
    connection.createOffer(function(offer){
      connection.setLocalDescription(offer);
      socket.send('offer',[socket.peer,offer.sdp])
    })
  }

  var sendAnswer = function(){
    connection.createAnswer(function(answer){
      connection.setLocalDescription(answer);
      socket.send('answer',[socket.peer,answer.sdp])
    })
  }

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
  connection.onicecandidate = function(e){
    // commented out temporarily as it generates too much noise
    // debug.connection('icecandidate',arguments)
    if( e.candidate && socket.peer ){
      socket.send('icecandidate',[
        socket.peer,
        e.candidate.candidate,
        e.candidate.sdpMid,
        e.candidate.sdpMLineIndex
      ])
    }
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
  connection.onnegotationneeded = function(e){
    debug.connection('negotationneeded',arguments)
    rtc.emit('negotationneeded',e)
  }
  connection.onstatechange = function(e){
    debug.connection('statechange -> %s',connection.readyState,arguments)
    rtc.emit('statechange',e)
  }

  // using a sync xhr request to make sure
  // the client gets disconnected. because
  // using AppEngine channel doesn't work.
  var unload = window.onunload;
  window.onunload = function(e){
    if( typeof unload == 'function' )
      unload.call(this,e);
    var req = new XMLHttpRequest();
    req.open('GET', '/disconnected?room='+room+'&client='+rtc.clientId, false);
    req.send();
  }

  rtc.addStream = function(stream){
    debug.connection('adding local stream')
    connection.addStream(stream);
    sendOffer();
  }

  return rtc;
}
