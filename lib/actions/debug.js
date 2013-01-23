var debug = require('debug')('actions:debug')
  , diff = require('../support/diff')
  , inspect = require('../support/inspect')

exports.debugDiff = function(world, remoteState){
  var remoteState = remoteState && remoteState.replace(/\\n/g,'\n')
  var localState;

  // temporary remove some uninteresting references
  var ignore = ['me','opponent','host','players.a.paddle','players.b.paddle']
  exclude(world,ignore,function(world){
    localState = inspect(world,{depth:Infinity});
  })

  // received a state from other player
  if( remoteState ){
    console.log('got a remote state')
    console.log(diff.createPatch('diff',remoteState,localState))

  // sending state reliably to other player
  } else {
    console.log('sending debug diff! %d ',world.frame)
    // buffer.push('dd', world.frame)
    // buffer.push(localState.replace(/\n/mg,'\\n'),EOP)
  }
  return localState;
}




// temporary excludes properties in `obj` defined in `excluded`
// calls fn with the obj and then adds the properties back after
// the callback.
function exclude(obj,excluded,fn){
  var map = {}
  excluded.forEach(function(prop){
    var props = prop.split('.');
    var tmp = obj;
    for (var i = 0; i < props.length; ++i) {
      var name = props[i];
      if( i == props.length-1 ){
        map[prop] = tmp[name]
        delete tmp[name]
      } else {
        tmp = tmp[name];
      }
    }
  })
  fn(obj)
  Object.keys(map).forEach(function(prop){
    var props = prop.split('.');
    var tmp = obj;
    for (var i = 0; i < props.length; ++i) {
      var name = props[i];
      if( i == props.length-1 ){
        tmp[name] = map[prop];
      } else {
        tmp = tmp[name];
      }
    }
  })
}
