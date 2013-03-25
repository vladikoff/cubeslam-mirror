var $ = require('jquery')
  , inputs = require('../inp');

var p = ''; // previous string
module.exports = function(ctx){
  var s = '';
  s += world(ctx.game.world) || '';
  s += ctx.sync && world(ctx.sync.world) || '';
  s += inp(inputs.info()) || '';
  s += net(ctx.network) || '';
  s += ctx.network.remote && peercon(ctx.network.remote.connection) || '';
  s += ctx.network.game && datchan(ctx.network.game.channel) || '';
  s += ctx.network.game && netchan(ctx.network.game) || '';
  s += report;

  if( p !== s ){
    $('#debug-info pre').text(s);
    p = s;
  }
}

function world(w){
  return 'World\n\t' + [
   'name: '+w.name,
   'frame: '+w.frame,
   // 'code: '+w.code(), // NOTE: HEAVY
   'seed: '+w.rand.state,
   'state: '+w.state
  ].join('\n\t') + '\n\n'
}

function netchan(nc){
  return nc && 'NetChannel\n\t' + [
    'seq: '+nc.seq,
    'ack: '+nc.ack,
    'buffer: '+nc.buffer.length,
    'buffer size: '+nc.bufferLength,
    'encoded: '+(nc.encoded&&nc.encoded.byteLength)
  ].join('\n\t') + '\n\n'
}

var report = 'unavailable';
function peercon(pc){
  if( pc && typeof pc.getStats == 'function'){
    pc.getStats(function(s){ report = stats(s.result()) })
  }
  return pc && 'PeerConnection\n\t' + [
    'ice: '+pc.iceConnectionState,
    'gathering: '+pc.iceGatheringState,
    'signal: '+pc.signalingState
  ].join('\n\t') + '\n\n'
}

function datchan(dc){
  return dc && 'DataChannel\n\t' + [
    'label: '+dc.label,
    'reliable: '+dc.reliable,
    'bufferedAmount: '+dc.bufferedAmount,
    'ready: '+dc.readyState
  ].join('\n\t') + '\n\n'
}

function inp(i){
  return i && 'Inputs\n\t' + [
    'ack: ' + i.ack,
    'paused: ' + i.paused,
    'willPause: ' + i.willPause,
    'replaying: ' + i.replaying,
    'forwarding: ' + i.forwarding,
    'sequence: ' + i.sequence,
    'lastSeq: ' + i.lastSeq,
    'latency: ' + i.latency,
    'recorded: ' + i.recorded,
    'tosend: ' + i.sendbuf,
    'sendlen: ' + i.sendlen,
    'qloc: ' + i.qloc,
    'qnet: ' + i.qnet
  ].join('\n\t') + '\n\n'
}

function net(n){
  return n && 'Network\n\t' + [
    'connected: ' + n.connected,
    'winner: ' + n.winner,
    'ready: ' + n.ready,
    'pathname: ' + n.pathname,
    'challenge: ' + n.challenge,
  ].join('\n\t') + '\n\n'
}

function stats(results){
  var s = '';
  for (var i = 0; i < results.length; ++i) {
    var res = results[i];
    s += 'Report ' + i + '\n\t';
    if (res.local) {
      s += "Local\n";
      s += dump(res.local,"\t\t");
      s += '\n\t'
    }
    if (res.remote) {
      s += "Remote\n";
      s += dump(res.remote,"\t\t");
      s += '\n\t'
    }
  }
  return s;
}

// Dumping a stats variable as a string.
// might be named toString?
function dump(obj,pre) {
  var s = pre+'Timestamp: ' + obj.timestamp;
  if (obj.names) {
    var names = obj.names();
    for (var i = 0; i < names.length; ++i) {
       s += '\n'+pre;
       s += names[i];
       s += ':';
       s += obj.stat(names[i]);
    }
  } else {
    if (obj.stat('audioOutputLevel')) {
      s += "audioOutputLevel: ";
      s += obj.stat('audioOutputLevel');
      s += "\n"+pre;
    }
  }
  return s;
}