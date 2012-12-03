// based on https://github.com/webRTC/webrtc.io-client

var Emitter = require('emitter')
  , debug = { connection: require('debug')('rtc:connection'),
              channel: require('debug')('rtc:channel') };

// Fallbacks for vendor-specific variables until the spec is finalized.
var PeerConnection = window.PeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection
  , URL = window.URL || window.webkitURL || window.msURL || window.oURL
  , getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

exports.connections = [];
exports.configuration = { iceServers: [{url: 'stun:stun.l.google.com:19302'}] };
exports.connect = function(token,room,clientId){
  var rtc = Emitter({})
    , channel = rtc.channel = new goog.appengine.Channel(token)
    , socket = rtc.socket = channel.open()
    , connection = rtc.connection = new PeerConnection(exports.configuration);

  // some public access to all connections
  this.connections.push(rtc);

  socket.onopen = function(){
    debug.channel('open',arguments)
  }
  socket.onerror = function(e){
    debug.channel('error',arguments)
    console.error('rtc socket error',arguments)
    rtc.emit('error',e)
  }
  socket.onmessage = function(msg){
    //console.log('Channel API: ' + msg.data);
    var json = JSON.parse(msg.data);

    // redundant...
    // debug.channel('message',msg.data)
    switch(json.Type){

      case 'disconnected':
        debug.channel('disconnected user',json.Data)
        if( json.Data === socket.peer ){ // ignore own disconnect
          rtc.emit('disconnect',json.Data);
          delete socket.peer;
        }
        break;

      // received an offer (data=offer)
      case 'offer':
        debug.channel('offer',json.Data)
        socket.peer = json.From
        var offer = JSON.parse(json.Data)
          , desc = new RTCSessionDescription(offer);
        connection.setRemoteDescription(desc);
        sendAnswer();
        break;

      // received an answer (data=sdp)
      case 'answer':
        debug.channel('answer',json.Data)
        var answer = JSON.parse(json.Data)
          , desc = new RTCSessionDescription(answer);
        connection.setRemoteDescription(desc);
        break;

      // received a candidate (data={candidate,sdpMid,sdpMLineIndex})
      case 'icecandidate':
        debug.channel('icecandidate',json.Data)
        try {
          var cand = JSON.parse(json.Data)
            , candidate = new RTCIceCandidate(cand)
          connection.addIceCandidate(candidate);
        } catch(e) {
          console.log('iceState: %s',connection.iceState)
          console.warn('got an icecandidate too early',json.Data,e)
        }
        break;

      case 'demoted':
        // I am guest (so there are multiple players), hence send RTC offers.
        sendOffer();
        // Do not break here.

      default:
        debug.channel('event',json.Type,json.Data)
        rtc.emit(json.Type,json.Data);

    }
  }
  socket.onclose = function(){
    debug.channel('close')
    rtc.emit('disconnect',socket.peer)
    delete socket.peer;
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
    var msg = {
      Room: room,
      To: data ? to : '',
      From: clientId,
      Type: type,
      Data: JSON.stringify(data || to)
    };
    var req = new XMLHttpRequest()
    req.onerror = this.onerror.bind(this)
    req.open('POST', '/message', true)
    req.setRequestHeader('Content-Type','application/json')
    req.send(JSON.stringify(msg))
    debug.channel('send "%s" => %s %j',type,to,data)
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
    connection = new PeerConnection(exports.configuration);
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
    if( e.candidate && socket.peer ){
      debug.connection('icecandidate',arguments)
      socket.send('icecandidate',socket.peer,{
        candidate: e.candidate.candidate,
        sdpMid: e.candidate.sdpMid,
        sdpMLineIndex: e.candidate.sdpMLineIndex
      })
    } else if( socket.peer ){
      debug.connection('end of icecandidates')
    } else {
      console.warn('unexpected icecandidate',e)
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
  connection.onnegotiationneeded = function(e){
    debug.connection('negotiationneeded',arguments)
    sendOffer();
    rtc.emit('negotiationneeded',e)
  }
  connection.onstatechange = function(e){
    debug.connection('statechange -> %s',connection.readyState,arguments)
    rtc.emit('statechange',e)
  }

  var sendOffer = function(){
    debug.connection('sending offer (readystate:%s)',connection.readyState)
    connection.createOffer(function(offer){
      connection.setLocalDescription(offer);
      socket.send('offer',"",offer) // Empty to-string == send to everyone on this channel.
    },function(){console.error('could not create offer',arguments)})
  }
  var sendAnswer = function(){
    if( socket.peer ){
      // TODO check that we're not already waiting for one?
      debug.connection('sending answer (readystate:%s)',connection.readyState)
      connection.createAnswer(function(answer){
        connection.setLocalDescription(answer);
        socket.send('answer',socket.peer,answer)
      },function(){console.error('could not create answer',arguments)})
    } else {
      debug.connection('not sending answer (readystate:%s)',connection.readyState)
    }
  }

  // private methods while testing
  rtc._sendOffer = sendOffer;
  rtc._sendAnswer = sendAnswer;

  rtc.addStream = function(stream){
    debug.connection('adding local stream')
    connection.addStream(stream);
  }

  return rtc;
}
