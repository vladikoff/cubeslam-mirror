var $ = require('jquery')
  , inputs = require('../inp');

module.exports = function(ctx){
  $('#info-game-world').text(world(ctx.game.world) || '')
  $('#info-sync-world').text(ctx.sync && world(ctx.sync.world) || '')
  $('#info-netchan').text(ctx.network.game && netchan(ctx.network.game) || '')
  $('#info-datchan').text(ctx.network.game && datchan(ctx.network.game.channel) || '')
  $('#info-peercon').text(ctx.network.remote && peercon(ctx.network.remote.connection) || '')
  $('#info-inputs').text(inp(inputs.info()) || '')
  $('#info-network').text(net(ctx.network) || '')
}

function world(w){
  return 'World\n\t' + [
   'name: '+w.name,
   'frame: '+w.frame,
   // 'code: '+w.code(), // NOTE: HEAVY
   'seed: '+w.rand.state,
   'state: '+w.state
  ].join('\n\t')
}

function netchan(nc){
  return nc && 'NetChannel\n\t' + [
    'seq: '+nc.seq,
    'ack: '+nc.ack,
    'buffer: '+nc.buffer.length,
    'buffer size: '+nc.bufferLength,
    'encoded: '+(nc.encoded&&nc.encoded.byteLength)
  ].join('\n\t')
}

function peercon(pc){
  return pc && 'PeerConnection\n\t' + [
    'ice: '+pc.iceConnectionState,
    'gathering: '+pc.iceGatheringState,
    'signal: '+pc.signalingState
  ].join('\n\t')
}

function datchan(dc){
  return dc && 'DataChannel\n\t' + [
    'label: '+dc.label,
    'reliable: '+dc.reliable,
    'bufferedAmount: '+dc.bufferedAmount,
    'ready: '+dc.readyState
  ].join('\n\t')
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
  ].join('\n\t')
}

function net(n){
  return n && 'Network\n\t' + [
    'connected: ' + n.connected,
    'ready: ' + n.ready,
    'pathname: ' + n.pathname,
    'winner: ' + n.winner,
    'challenge: ' + n.challenge,
  ].join('\n\t')
}