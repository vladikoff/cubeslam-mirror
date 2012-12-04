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
          rtc.emit('disconnect',json.Data);
          delete socket.peer;
        }
        break;

      // received an offer (data=offer)
      case 'offer':
        debug.channel('offer',json.Data)
        var offer = JSON.parse(json.Data)
          , desc = new RTCSessionDescription(offer);
        socket.peer = json.From;

        console.dir(connection);
        connection.setRemoteDescription(desc, function() {
          console.log('SUCCESS: setRemoteDescrition (from offer)');
          sendAnswer();
          rtc.emit('offer');
        }, function() {
          console.log("FAIL: setRemoteDescription (from offer)");
          console.dir(arguments);
          console.dir(offer);
          console.dir(connection);

          console.log('Replacing old connection object with new.');
          connection = rtc.connection = new PeerConnection(exports.configuration);
          connection.setRemoteDescription(desc, function() {
            console.log('SUCCESS: setRemoteDescrition (from offer - 2nd try)');
            sendAnswer();
            rtc.emit('offer');
          }, function() {
            console.log('Failed twice.');
          });

        });

        break;

      // received an answer (data=sdp)
      case 'answer':
        debug.channel('answer',json.Data)
        var answer = JSON.parse(json.Data)
          , desc = new RTCSessionDescription(answer);
        socket.peer = json.From;

        console.dir(connection);
        connection.setRemoteDescription(desc, function() {
          console.log('SUCCESS: setRemoteDescrition (from answer)');
          rtc.emit('answer');
        }, function() {
          console.log("FAIL: setRemoteDescription (from answer)");
          console.dir(arguments);
          console.dir(answer);
          console.dir(connection);

          console.log('Replacing old connection object with new.');
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
    /*
    if (typeof(this.candidateBuffer) == 'undefined') {
      this.candidateBuffer = [];
    }
    if( e.candidate && socket.peer ){
      this.candidateBuffer.push({
        candidate: e.candidate.candidate,
        sdpMid: e.candidate.sdpMid,
        sdpMLineIndex: e.candidate.sdpMLineIndex
      });
    } else {
      if (this.candidateBuffer.length > 0) {
        socket.send('icecandidate', "", this.candidateBuffer)
        this.candidateBuffer = [];
      }
      debug.connection('end of icecandidates')
    }
    */
    if (e.candidate) {
      console.log('onicecandidate called. arguments:');
      console.dir(arguments);
      socket.send('icecandidate', "", {
        candidate: e.candidate.candidate,
        sdpMid: e.candidate.sdpMid,
        sdpMLineIndex: e.candidate.sdpMLineIndex
      })
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
    debug.connection('sending offer (readystate:%s)',connection.readyState,connection)
    connection.createOffer(function(offer){
      connection.setLocalDescription(offer,function(){
        // Empty to-string == send to everyone on this channel.
        socket.send('offer',"",offer);
      },function(err){console.error('could not set local description from offer',offer.sdp,err,connection)});
    },function(){console.error('could not create offer',arguments,connection)})
  }
  var sendAnswer = function(){
      // TODO check that we're not already waiting for one?
      debug.connection('sending answer (readystate:%s)',connection.readyState,connection)
      connection.createAnswer(function(answer){
        connection.setLocalDescription(answer,function(){
          socket.send('answer',socket.peer,answer)
        },function(err){console.error('could not set local description from answer',answer.sdp,err,connection)});
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
