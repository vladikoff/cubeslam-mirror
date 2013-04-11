var $ = require('jquery')
  , settings = require('../settings')
  , inputs = require('../inputs')
  , vec = require('geom').vec;

var p = ''; // previous string
var report = ''; // the PeerConnection#getStats results
var disabled = false;
var pre = $('#debug-info pre')[0];
module.exports = function(ctx,show){

  if( show ){
    $('#debug-info').show()
  } else if( show === false ){
    disabled = true;
  }

  if( disabled ){
    return;
  }

  var s = '';
  s += context(ctx)
  s += query(ctx.query)
  s += world(ctx.game.world,ctx.sync&&ctx.sync.world) || '';
  s += ctx.sync && world(ctx.sync.world,ctx.game.world) || '';
  s += net(ctx.network) || '';
  s += inp(inputs.info()) || '';
  s += game(ctx.game.world) || '';
  s += ctx.network.remote && peercon(ctx.network.remote.connection) || '';
  s += ctx.network.game && datchan(ctx.network.game.channel) || '';
  s += ctx.network.game && netchan(ctx.network.game) || '';
  s += report;

  if( p !== s ){
    // $('#debug-info pre').text(s);
    pre.innerText = s;
    p = s;
  }
}

function context(ctx){
  return 'Context\n\t' + [
    'dev: '+ ctx.dev,
    'pathname: '+ ctx.pathname,
    'multiplayer: '+!!ctx.multiplayer,
    'touch: '+!!ctx.touch,
    'silent: '+!!ctx.silent,
    'mobile: '+!!ctx.mobile,
    'room: '+ctx.room,
    'user: '+ctx.user
  ].join('\n\t') + '\n\n'
}

function query(q){
  return 'Query\n\t'
    + Object.keys(q).map(function(k){
      return k+': '+(q[k] || true)
    }).join('\n\t') + '\n\n'
}

function game(w){
  return 'Game\n\t' + [
    'bullets: '+w.bullets.length,
    'forces: '+w.forces.length,
    'shields: '+w.shields.length,
    'extras: '+w.extras.length,
    'obstacles: '+w.obstacles.length,
    'paddles: '+w.paddles.length,
    'paddle(0) radiusSq: '+(w.paddles.length && w.paddles.values[0].radiusSq),
    'paddle(1) radiusSq: '+(w.paddles.length && w.paddles.values[1].radiusSq),
    'pucks: '+w.pucks.length,
    'puck(0) velocity: '+(w.pucks.length && vec.len(w.pucks.values[0].velocity)),
  ].join('\n\t') + '\n\n'
}

function world(w,o){
  return 'World\n\t' + [
   'name: '+w.name,
   'frame: '+w.frame+(o?' ('+(w.frame-o.frame)+')':''),
   'multiplayer: '+w.multiplayer,
   // 'code: '+w.code(), // NOTE: HEAVY
   'seed: '+w.rand.state,
   'state: '+w.state,
   'score: '+w.players.a.score+' - '+w.players.b.score,
   'me: '+ (w.me && (w.me === w.players.a ? 'a' : 'b') + (w.me.hit !== -1 ? '(hit)':'')),
   'opponent: '+ (w.opponent && (w.opponent === w.players.a ? 'a' : 'b') + (w.opponent.hit !== -1 ? '(hit)':'')),
  ].join('\n\t') + '\n\n'
}

function netchan(nc){
  return nc && 'NetChannel\n\t' + [
    'seq: '+nc.seq,
    'ack: '+nc.ack,
    'resent: '+nc.resent,
    'sent acks: '+nc.sentACKs,
    'recv acks: '+nc.recvACKs,
    'buffer: '+nc.buffer.length,
    'buffer size: '+nc.bufferLength,
    'encoded: '+(nc.encoded&&nc.encoded.byteLength)
  ].join('\n\t') + '\n\n'
}

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
    'replaying: ' + i.replaying,
    'recorded: ' + i.recorded,
    'buffered: ' + i.buffered,
    'length: ' + i.length,
    'loc: ' + i.loc,
    'net: ' + i.net
  ].join('\n\t') + '\n\n'
}

function net(n){
  return n && 'Network\n\t' + [
    'connected: ' + n.connected,
    'winner: ' + n.winner,
    'ready: ' + n.ready,
    'pathname: ' + n.pathname,
    'challenge: ' + n.challenge,
    'send rate: ' + settings.data.sendRate + 'hz',
    'keep alive interval: ' + settings.data.keepAliveInterval+'ms'
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