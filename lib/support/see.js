var Emitter = require('emitter')
  , debug = require('debug')('see');

module.exports = see;

Emitter(see)

var context = {}
  , states = {}
  , finder = new Traverse(states);

// see(path,state)
// see(path)
// see([ctx])
function see(path,state){
  // create
  // see(path,state)
  if( typeof path == 'string' && typeof state == 'object' ){
    path = normalize(path)
    debug('create',path,[state])
    if( !states[path] ) states[path] = [];
    state.path = path;
    states[path].push(state);

  // go
  // see(path)
  } else {
    debug('go',path)
    see.go(path || '/')

  }
}

see.go = function(path){
  path = normalize(path);

  // find enter/leave states
  if( !finder.to(path) )
    return console.warn('path not found: %s',path);

  // build queue
  var queue = [];
  for(var i=0; i < finder.leave.length; i++){
    var s = finder.leave[i];
    if( s && typeof s.leave == 'function' )
      queue.push(emit('leave',s));
    else
      console.warn('invalid leave state?',s)
  }
  for(var i=0; i < finder.enter.length; i++){
    var s = finder.enter[i];
    if( s && typeof s.enter == 'function' )
      queue.push(emit('enter',s))
    else
      console.warn('invalid enter state?',s)
  }

  console.log('queue',queue)

  // execute async or sync
  var i=0, fn;
  function next(err){
    if( err instanceof Error ){
      throw err;

    } else if( fn = queue[i++] ){

      // update the context path data
      updateContext(fn.path);

      see.emit(fn.event,context)

      // async
      if( fn.length >= 2 ){
        console.log('async',i,fn.name)
        return fn(context,next);

      // sync
      } else {
        console.log('sync',i,fn.name)
        fn(context)
        next()
      }
    } else {
      // done!
      console.log('done! no more states')
    }
  }

  next();
}

function emit(event,state){
  var fn = state[event].bind(state);
  fn.event = event;
  fn.path = state.path;
  return fn;
}


function Traverse(paths,current){
  this.paths = paths;
  this.current = current;
  this.enter = [];
  this.leave = [];
}
Traverse.prototype.to = function(path){
  this.enter.length = 0;
  this.leave.length = 0;
  if(resolve(this.paths,this.current,path,this.leave,this.enter)){
    this.current = path;
    return true;
  } else {
    return false;
  }
}
Traverse.prototype.from = function(path){
  this.enter.length = 0;
  this.leave.length = 0;
  if(resolve(this.paths,path,this.current,this.leave,this.enter)){
    this.current = path;
    return true;
  } else {
    return false;
  }
}


// resolves nodes from a path to another
//  resolve(paths,from,to,leaveList,enterList) -> Boolean
function resolve(paths,from,to,leave,enter){
  // normalize paths
  from = normalize(from)
  to = normalize(to)

  // split into arrays
  var frParts = from.split('/')
    , toParts = to.split('/');

  // find least common denominator
  var max = Math.min(frParts.length,toParts.length)
    , lcd = 0;
  for(var i=0; i<max; i++){
    if( frParts[i] !== toParts[i] ){
      lcd = i;
      break;
    }
  }

  console.log('paths',paths)
  console.log('from',frParts,from)
  console.log('to',toParts,to)
  console.log('lcd',lcd)

  // from - lcd = leave
  for(var f=frParts.length; f > lcd ; f--){
    var path = frParts.slice(0,f+1).join('/');
    console.log('leave(%s)? "%s"',f,path)
    if( paths[path] ){ // leave
      console.log('leave',path,paths[path])
      leave.push.apply(leave,paths[path])
    }
  }

  // special case for the initial see()
  if( !from && paths['/'] ){
    enter.push.apply(enter,paths['/'])
  }

  // to - lcd = enter
  for(var t=lcd; t < toParts.length; t++){
    var path = toParts.slice(0,t+1).join('/');
    console.log('enter(%s)? "%s"',t,path)
    if( paths[path] ){// enter
      console.log('enter "%s"',path,paths[path])
      enter.push.apply(enter,paths[path])
    }
  }

  console.log('entering: %s leaving: %s',enter.length, leave.length)

  return enter.length > 0 || leave.length > 0;
}

function normalize(path){
  // TODO ("../" "./" "/" "//")
  return path || '';
}

function updateContext(path){
  var i = path.indexOf('?');
  Object.defineProperties(context,{
    path: {
      value: path,
      configurable: true
    },
    pathname: {
      value: ~i ? path.slice(0, i) : path,
      configurable: true
    },
    querystring: {
      value: ~i ? path.slice(i + 1) : '',
      configurable: true
    }
  })
}