
(function() {

  var
    // Configuration:
    hostname = window.CHANNEL_HOST || window.location.hostname || 'localhost',
    websocketServer = "ws://"+hostname+":8000/",
  
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
      return;
    } catch(e){
      // TODO verify the Error
    }
  }

  function DataChannel(peerConnection,label,dataChannelDict) {
    this.label = label;
    this.reliable = dataChannelDict && dataChannelDict.reliable;
    this._peerConnection = peerConnection;

    this._webSocket = new WebSocket(websocketServer);
    this._webSocket.onclose = function() {
      // Do something!
    }

    this.readyState = "connecting";

    this._webSocket.onopen = function() {
      this.readyState = "open";
      this._identify();
    }.bind(this);

    this._webSocket.onmessage = function(msg) {
      if (typeof this.onmessage == 'function') {
        this.onmessage(msg);
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
    this._webSocket.close();
  };

  DataChannel.prototype.send = function(data, onErrorCallback) {
    if( this.readyState == 'open' )
      this._webSocket.send(data, onErrorCallback);
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
    setLocalDescription.call(this, description);
  };

  PeerConnection.prototype.setRemoteDescription = function(description) {
    this._remoteDescription = description;
    if (typeof(this._allDataChannels) != 'undefined') {
      for (var i in this._allDataChannels) {
        this._allDataChannels[i]._identify();
      }
    };
    setRemoteDescription.call(this, description);
  };

}());
