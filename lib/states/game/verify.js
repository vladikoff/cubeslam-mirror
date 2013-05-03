var debug = require('debug')('states:game:verify')
  , exclude = require('../../support/exclude')
  , keys = require('mousetrap')
  , World = require('../../world')
  , inputs = require('../../inputs')
  , diff = require('../../support/diff');

var hashes = {}
  , jsons = {}
  , verifyInputs = []
  , interval;

var ctx;

exports.enter = function(context){
  ctx = context;
  if( !ctx.query.verify ){
    return;
  }

  if( ctx.query.verify == 'inputs' ){
    keys.bind('i',sendInputs)
    ctx.network.remote.on('inputs',compareInputs)
    inputs.network.on('dequeue',logInputs)
  } else {
    keys.bind('.',sendHashes)
    ctx.network.remote.on('hashes',compareHashes)
    ctx.network.remote.on('world',compareWorlds)
    ctx.sync.on('post update',logHashCode)
  }

  if( !isNaN(ctx.query.verify) ){
    var ms = +ctx.query.verify;
    console.warn('sending hashes every %sms',ms)
    interval = setInterval(function(){ keys.trigger('.') },ms)
  }
}


exports.leave = function(ctx){
  if( !ctx.query.verify ){
    return;
  }
  clearInterval(interval);
  keys.unbind('.',sendHashes)
  ctx.network.remote.off('inputs',compareInputs)
  ctx.network.remote.off('hashes',compareHashes)
  ctx.network.remote.off('world',compareWorlds)
  ctx.sync && ctx.sync.off('post update',logHashCode)
  inputs.network.off('dequeue',logInputs)
}

function sendHashes(){
  console.log('sending %s hashes!',hashes.length)
  if( !hashes.length ){ return; }
  ctx.network.remote.signal.send({type:'hashes',hashes: hashes})
}

function sendInputs(){
  console.log('sending %s inputs!',verifyInputs.length/2)
  if( !verifyInputs.length ){ return; }
  ctx.network.remote.signal.send({type:'inputs',inputs: verifyInputs})
}

function compareInputs(e){
  console.groupCollapsed('comparing inputs')
  var l = Math.min(verifyInputs.length,e.inputs.length);
  for(var i=0; i<l; i+=2){
    if( !compareInput(i,verifyInputs,e.inputs) ){
      console.error('inputs mismatched!',verifyInputs[i],verifyInputs[i+1],e.inputs[i+1])
      throw new Error('inputs mismatched!')
    }
  }
  console.groupEnd('comparing inputs')
}

function compareInput(i,a,b){
  if( a[i] !== b[i] ){
    console.log('frames mismatched:',a[i],b[i])
    return false;
  }
  i += 1
  if( a[i][0] !== b[i][0] ){
    console.log('types mismatched:',a[i][0],b[i][0])
    return false;
  }
  if( a[i].length !== b[i].length ){
    console.log('input length mismatched:',a[i].length,b[i].length)
    return false;
  }
  for(var j=1; j<a[i].length; j++){
    if( a[i][j] !== b[i][j] ){
      console.log('input arguments mismatched:',a[i],b[i])
      return false;
    }
  }
  return true;
}

function compareHashes(e){
  var frames = [].concat(Object.keys(e.hashes),Object.keys(hashes))
                 .sort(function(a,b){return parseInt(a,10)-parseInt(b,10)});
  console.groupCollapsed('comparing hashes')
  var misMatch = null
    , f = -1; // last frame
  for(var i=0; i<frames.length; i++){
    var frame = frames[i];
    if( f === frame ){ continue; }
    f = frame;
    console.log(' frame: %s local: %s network: %s',frame,hashes[frame],e.hashes[frame]);
    if( hashes[frame] && e.hashes[frame] && hashes[frame] !== e.hashes[frame] ){
      console.log(' hashes does not match (%s vs %s), sending json of world to compare',hashes[frame],e.hashes[frame])
      ctx.network.remote.signal.send({type:'world',frame: frame,world: jsons[frame]})
      misMatch = frame;
      break;
    }
  }
  console.groupEnd('comparing hashes')
  if( misMatch !== null ){
    console.error('hashes did not match at %s',misMatch)
    throw new Error('check diff on other machine plz');
  }
}

function compareWorlds(e){
  var misMatch = false;
  console.group('comparing worlds at frame %s',e.frame)
  if( jsons[e.frame] !== e.world ){
    console.log('NOT THE SAME, trying diff:')
    console.log(diff.createPatch('diff for frame '+e.frame,jsons[e.frame],e.world,'local','remote'))
    console.log('remote',[JSON.parse(e.world)])
    console.log('local',[JSON.parse(jsons[e.frame])])
    misMatch = true;
  }
  console.groupEnd('comparing worlds at frame %s',e.frame)

  if(misMatch){
    throw new Error('check diff plz');
  }
}

// used as JSON replacer to
// find undefined values
function unhide(k,v){
  if( typeof v == 'undefined' ){
    return 'undefined';
  }
  return v;
}

function logHashCode(world){
  // hash and store without me/opponent/name
  hashes[world.frame] = world.code()
  exclude(world,World.EXCLUDED,function(world){
    jsons[world.frame] = JSON.stringify(world,unhide,2)
  })
}

function logInputs(input,frame){
  verifyInputs.push(frame,input);
}