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
    , connection = rtc.connection = new PeerConnection(exports.configuration)
    , opened = false
    , buffer = [];

  // some public access to all connections
  this.connections.push(rtc);

  socket.onopen = function(){
    debug.channel('open',arguments)
    opened = true

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
    //console.log('Channel API: ' + msg.data);
    var json = JSON.parse(msg.data);

    // redundant...
    // debug.channel('message',msg.data)
    switch(json.Type){

      case 'disconnected':
        debug.channel('disconnected user',json.Data)
        if( json.Data === socket.peer ){ // ignore own disconnect
          delete socket.peer;
        }
        break;

      // received an offer (data=offer)
      case 'offer':
        debug.channel('offer',json.Data)
        var offer = JSON.parse(json.Data)
          , desc = new RTCSessionDescription(offer);
        socket.peer = json.From;
        connection.setRemoteDescription(desc,sendAnswer,function(err){
          console.warn('1st offer attempt. recreating the PeerConnection object.');
          connection = rtc.connection = new PeerConnection(exports.configuration);
          connection.setRemoteDescription(desc,sendAnswer,function(err){
            console.error('could not set remote description from offer',desc.sdp,err,connection)
          });
        });
        break;

      // received an answer (data=sdp)
      case 'answer':
        debug.channel('answer',json.Data)
        var answer = JSON.parse(json.Data)
          , desc = new RTCSessionDescription(answer);
        socket.peer = json.From;
        function setAnswer(){}
        connection.setRemoteDescription(desc,setAnswer,function(err){
          console.warn('1st answer attempt. recreating the PeerConnection object.');
          connection = rtc.connection = new PeerConnection(exports.configuration);
          sendOffer();
        });
        break;

      // received a candidate (data={candidate,sdpMid,sdpMLineIndex})
      case 'icecandidate':
        debug.channel('icecandidate',json.Data)
        var cands = JSON.parse(json.Data);
        if (cands.length) {
          for (i in cands) {
            candidate = new RTCIceCandidate(cands[i])
            connection.addIceCandidate(candidate);
          }
        } else {
          candidate = new RTCIceCandidate(cands);
          connection.addIceCandidate(candidate);
        }
        break;

      case 'participants':
        if (roomParticipants != json.Data) {

          // Emit disconnect events:
          var oldParts = roomParticipants.split("|")
            , newParts = json.Data.split("|");
          for (i in oldParts) {
            var disconnected = true;
            for (j in newParts) {
              if (oldParts[i] == newParts[j]) {
                disconnected = false;
              }
            }
            if (disconnected) {
              rtc.emit('disconnect', oldParts[i]);
            }
          }
          socket.peer = null;
          for (i in newParts) {
            if (newParts[i] != clientId) {
              socket.peer = newParts[i];
              break;
            }
          }

          roomParticipants = json.Data;
          rtc.emit('participantsUpdated');
        }
        break;

      default:
        debug.channel('event',json.Type,json.Data)
        rtc.emit(json.Type,json.Data);

    }
  }
  socket.onclose = function(){
    debug.channel('close')
    rtc.emit('disconnect',socket.peer)
    delete socket.peer;
    opened = false;

    // close peer connection if it's not already
    if( connection.readyState !== 'closed' )
      connection.close();
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
    if( !opened ){
      debug.channel('send (BUFFERED) "%s" => %s %j',type,to,data)
      return buffer.push(arguments);
    }
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
    this.candidateBuffer = [];
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
  var icecandidates = null;
  connection.onicecandidate = function(e){
    /*
    if (typeof(icecandidates) == 'undefined') {
      icecandidates = [];
    }
    if( e.candidate && socket.peer ){
      icecandidates.push({
        candidate: e.candidate.candidate,
        sdpMid: e.candidate.sdpMid,
        sdpMLineIndex: e.candidate.sdpMLineIndex
      })
    } else if( socket.peer ){
      debug.connection('end of icecandidates')
      if( icecandidates ){
        debug.connection(' sending %s candidates',icecandidates.length)
        socket.send('icecandidate','',icecandidates)
        icecandidates = null; // TODO bad for GC
      } else {
        debug.connection(' no candidates was receieved')
      }
    }
    */
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
    debug.connection('sending offer (readystate:%s)',connection.readyState,connection)
    connection.createOffer(function(desc){
      connection.setLocalDescription(desc,function(){
        // Empty to-string == send to everyone on this channel.
        socket.send('offer',"",desc);
      },function(err){console.error('could not set local description from offer',desc.sdp,err,connection)});
    },function(){console.error('could not create offer',arguments,connection)})
  }
  var sendAnswer = function(){
    // TODO check that we're not already waiting for one?
    debug.connection('sending answer (readystate:%s)',connection.readyState,connection)
    connection.createAnswer(function(desc){
      connection.setLocalDescription(desc,function(){
        socket.send('answer',socket.peer,desc)
      },function(err){console.error('could not set local description from answer',desc.sdp,err,connection)});
    },function(){console.error('could not create answer',arguments,connection)})
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
