var Emitter = require('emitter')
  , debug = require('debug')('rtc:signal:ws');


module.exports = WebSocketSignal;

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
    debug('create')

    retryTimeout *= 2;
    retryAttempts++;
    if( retryAttempts >= opts.maxAttempts )
      return console.error('tried to connect to %s %s times without success. giving up.',opts.url,retryAttempts)

    var ws = new WebSocket(opts.url)
      , connected = null;

    ws.onopen = function(){
      debug('open')
      signal.emit('open') // create the peer connection here
      clearTimeout(ws.timeout)
    }

    ws.onmessage = function(m){
      // reset retry timeout on first message
      retryTimeout = opts.retryTimeout;
      retryAttempts = 0;

      var json = JSON.parse(m.data);
      if( json && json.type == 'offer' ){
        debug('offer',json)
        signal.emit('offer',new RTCSessionDescription(json))

      } else if( json && json.type == 'answer' ){
        debug('answer',json)
        signal.emit('answer',new RTCSessionDescription(json))

      } else if( json && json.type == 'close' ){
        debug('close')
        signal.emit('close');

      } else if( json && json.candidate ){
        debug('candidate',[json])
        signal.emit('candidate',new RTCIceCandidate(json))

      } else if( json && json.a && json.b ){
        if( !connected ){
          connected = true;
          debug('connected')
          signal.emit('connected') // from peer
        }

      } else if( json && ((json.a && !json.b) || (json.b && !json.a)) ){
        if( connected === true ){
          connected = false;
          debug('disconnected')
          signal.emit('disconnected') // from peer
        }

      } else if( json ){
        debug('message',m.data)
        if( json.type ){
          signal.emit('event',json)
        }
      } else {
        console.warn('invalid json',json)
      }
    }

    ws.onerror = function(e){
      console.error('WS error: ',e)
      clearTimeout(ws.timeout)
      signal.emit('close')
      signal.emit('error', e)
    }

    ws.onclose = function(){
      // if we weren't connected the room is most likely
      // full. in which case we let rtc know...
      if( !connected ){
        debug('closed (probably full)')
        signal.emit('event',{type:'full'})

      // if not it's probably a network error and
      // we should retry a few times.
      } else {
        // TODO emit "close" only after a few attempts
        //      and possible "reconnected" if retries
        //      work...
        debug('closed (retrying in %sms)',retryTimeout)
        signal.emit('close')
        clearTimeout(ws.timeout)
        ws.timeout = setTimeout(create,retryTimeout)
      }
    }

    clearTimeout(ws.timeout)
    ws.timeout = setTimeout(function(e){
      debug('timed out (retrying in %sms)',retryTimeout)
      clearTimeout(ws.timeout)
      ws.timeout = setTimeout(create,retryTimeout)
    },opts.timeout)

    signal.send = function(msg){
      debug('send',msg)
      if( ws.readyState == ws.OPEN ){
        if( typeof msg == 'string' )
          msg = JSON.stringify({type:msg});
        else
          msg = JSON.stringify(msg)
        ws.send(msg)
      } else {
        console.error('attempted to send a message too early, waiting for open')
        signal.on('open',signal.send.bind(signal,msg))
      }
    }

    return signal;
  }
  return create();
}