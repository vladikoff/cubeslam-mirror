// TODO!


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




-Network.prototype.requestToken = function(roomName){
-  var network = this;
-  $.ajax({
-    url: "/channeltoken/" + (new Date()).getTime(),
-    type: "POST",
-    data: {
-      roomName: roomName,
-      clientId: cookie("clientId")
-    },
-    dataType: "json",
-    error: function() {
-      console.error(arguments)
-      alert("Out of Google Channel API quotas?");
-    },
-    success: function(data){
-      network.setupRemote(data.token,roomName,cookie("clientId"));
-    }
-  })
-}
-