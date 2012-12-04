
(function() {

  var
    // Configuration:
    hostname = window.CHANNEL_HOST || window.location.host || 'localhost:8000',
    websocketServer = "ws://"+hostname+"/",

    // For browser compatibility:
    PeerConnection = window.PeerConnection
                  || window.RTCPeerConnection
                  || window.mozPeerConnection
                  || window.webkitRTCPeerConnection
                  || window.webkitPeerConnection00;

  if (typeof(PeerConnection) === 'undefined') {
    console.error('Your browser does not support PeerConnection.');
    return;
  }

  var pc = new PeerConnection(null);

  if (typeof(pc.createDataChannel) !== 'undefined') {
    try {
      // This will throw when data channels is not implemented properly yet
      pc.createDataChannel('polyfill')

      // If we get this far you already have DataChannel support.
      return console.log('REAL DATACHANNELS!');
    } catch(e){
      // TODO verify the Error
    }
  }

  function DataChannel(peerConnection,label,dataChannelDict) {
    this.readyState = "connecting";
    this.label = label;
    this.reliable = !dataChannelDict || dataChannelDict.reliable !== false;

    this._peerConnection = peerConnection;
    this._webSocket = new WebSocket(websocketServer);
    this._queue = [];

    this._webSocket.onclose = function() {
      this.readyState = "closed";
    }.bind(this);

    this._webSocket.onopen = function() {
      this.readyState = "open";
      this._identify();

      // empty the queue
      while(this._queue.length)
        this.send(this._queue.shift());
    }.bind(this);

    this._webSocket.onmessage = function(msg) {
      if (typeof this.onmessage == 'function') {
        this.onmessage(msg);
      }
    }.bind(this);

    this._webSocket.onerror = function(msg) {
      console.error(msg)
      if (typeof this.onerror == 'function') {
        this.onerror(msg);
      }
    }.bind(this);
  };

  DataChannel.prototype._identify = function() {
    if (this._peerConnection === null) return false;

    function description2id(description) {
      var result = description.sdp.replace(/(\r\n|\n|\r)/gm, '\n')
      var re = new RegExp("o=.+");
      result = re.exec(result)
      return result[0]
    }

    if (this._peerConnection._localDescription && this._peerConnection._remoteDescription) {
      this.send('connect:'
        + description2id(this._peerConnection._localDescription) + '_' + this.label + ':'
        + description2id(this._peerConnection._remoteDescription) + '_' + this.label);
    }
  };

  DataChannel.prototype.close = function() {
    this.readyState = "closing";
    this._webSocket.close();
  };

  DataChannel.prototype.send = function(data) {
    if( this.readyState == 'open' )
      this._webSocket.send(data);
    else if( this.reliable ) // queue messages when "reliable"
      this._queued.push(data);
  };

  PeerConnection.prototype.createDataChannel = function(label, dataChannelDict) {
    var channel = new DataChannel(this,label,dataChannelDict);

    if (typeof(this._allDataChannels) == 'undefined') {
      this._allDataChannels = [];
    }
    this._allDataChannels.push(channel);

    return channel;
  }

  // Overwrite PeerConnection's description setters, to get ID:s for the websocket connections.

  var
    setLocalDescription = PeerConnection.prototype.setLocalDescription,
    setRemoteDescription = PeerConnection.prototype.setRemoteDescription;

  PeerConnection.prototype.setLocalDescription = function(description) {
    this._localDescription = description;
    if (typeof(this._allDataChannels) != 'undefined') {
      for (var i in this._allDataChannels) {
        this._allDataChannels[i]._identify();
      }
    }
    setLocalDescription.apply(this, arguments);
  };

  PeerConnection.prototype.setRemoteDescription = function(description) {
    this._remoteDescription = description;
    if (typeof(this._allDataChannels) != 'undefined') {
      for (var i in this._allDataChannels) {
        this._allDataChannels[i]._identify();
      }
    };
    setRemoteDescription.apply(this, arguments);
  };

}());
