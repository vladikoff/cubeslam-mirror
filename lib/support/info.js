var $ = require('jquery')
  , settings = require('../settings')
  , inputs = require('../inputs')
  , vec = require('geom').vec;

var p = ''; // previous string
var report = ''; // the PeerConnection#getStats results
var disabled = false;
var pre = $('#debug-info pre')[0];
module.exports = function(ctx,enabled){

  if( enabled ){
    disabled = false;
  } else if( enabled === false ){
    disabled = true;
  }

  if( disabled ){
    return p;
  }

  var s = '';
  s += context(ctx)
  s += query(ctx.query)
  s += world(ctx.game.world,ctx.sync&&ctx.sync.world) || '';
  s += ctx.sync && world(ctx.sync.world,ctx.game.world) || '';
  s += net(ctx.network) || '';
  s += inp(inputs.info()) || '';
  s += ctx.network.remote && peercon(ctx.network.remote.connection) || '';
  s += ctx.network.remote && rtc(ctx.network.remote) || '';
  s += ctx.network.game && datchan(ctx.network.game.channel) || '';
  s += ctx.network.game && netchan(ctx.network.game) || '';
  s += ctx.renderer.impl && ctx.renderer.impl.renderer && webgl(ctx.renderer.impl.renderer.info) || '';
  s += game(ctx.game.world) || '';
  s += report;

  if( p !== s ){
    // $('#debug-info pre').text(s);
    pre.innerText = s;
    p = s;
  }

  return p
}

function context(ctx){
  return 'Context\n\t' + [
    'version: '+ctx.v,
    'dev: '+ ctx.dev,
    'pathname: '+ ctx.pathname,
    'multiplayer: '+!!ctx.multiplayer,
    'touch: '+!!ctx.touch,
    'silent: '+!!ctx.silent,
    'mobile: '+!!ctx.mobile,
    'room: '+ctx.room
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
    'framerate: '+settings.data.framerate,
    'speed: '+settings.data.unitSpeed,
    'bullets: '+w.bullets.length,
    'forces: '+w.forces.length,
    'shields: '+w.shields.length,
    'extras: '+w.extras.length,
    'obstacles: '+w.obstacles.length,
    'paddles: '+w.paddles.length,
    'pucks: '+w.pucks.length
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
   'wins: '+w.players.a.wins+' - '+w.players.b.wins,
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
  // if( pc && typeof pc.getStats == 'function'){
    // pc.getStats(function(s){ report = stats(s.result()) })
  // }
  return pc && 'PeerConnection\n\t' + [
    'ice: '+pc.iceConnectionState,
    'gathering: '+pc.iceGatheringState,
    'signal: '+pc.signalingState,
    'local streams: '+pc.getLocalStreams().length,
    'remote streams: '+pc.getRemoteStreams().length
  ].join('\n\t') + '\n\n'
}

function rtc(remote){
  return remote && 'RTC\n\t' + [
    'initiator: '+remote.initiator,
    'open: '+remote.open,
    'challenged: '+remote.challenged,
    'challenger: '+remote.challenger
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
    'user: ' + n.user,
    'ready state: ' + n.readyState,
    'pathname: ' + n.pathname,
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

function webgl(i){

    // memory: {
    //   programs: 0,
    //   geometries: 0,
    //   textures: 0
    // },

    // render: {
    //   calls: 0,
    //   vertices: 0,
    //   faces: 0,
    //   points: 0
    // }
  var m = i.memory;
  var r = i.render;
  return i && 'WebGL\n\t' + [
    'programs: ' + m.programs,
    'geometries: ' + m.geometries,
    'textures: ' + m.textures,
    'render calls: ' + r.calls,
    'vertices: ' + r.vertices,
    'faces: ' + r.faces,
    'points: ' + r.points
  ].join('\n\t') + '\n\n'
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