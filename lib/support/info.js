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

function peercon(pc){
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