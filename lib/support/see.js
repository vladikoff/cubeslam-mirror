var Emitter = require(typeof process == 'undefined' ? 'emitter' : 'emitter-component')
  , debug = require('debug')('see');

module.exports = see;

Emitter(see)

var context = {}
  , states = {}
  , finder = new Traverse(states)
  , queue = []
  , running = false
  , aborted = null;

// see(path,state)
// see(path)
// see([ctx])
function see(path,state){
  // create
  // see(path,state)
  if( arguments.length == 2 ){
    if( typeof state != 'object' )
      throw new ArgumentError('state must be an object');
    path = normalize(path)
    debug('create',path,[state])
    if( !states[path] ) states[path] = [];
    states[path].push(state);

  // go
  // see(path)
  } else {
    debug('go',path)
    see.go(path || '/')

  }
}

see.abort = function(){
  debug('abort',qs())
  aborted = queue[queue.length-1];
}

see.ctx = function(ctx){
  context = ctx;
}

see.go = function(path){
  path = normalize(path);

  if( !states[path] )
    return console.error('path does not exist: %s',path)

  // find enter/leave states
  if( !finder.to(path) )
    return console.warn('no states found (already here?): %s',path);

  // build queue
  for(var i=0; i < finder.leave.length; i+=2){
    var s = finder.leave[i+0]
      , p = finder.leave[i+1];
    if( s && typeof s.leave == 'function' )
      queue.push(emit('leave',s,p));
    else
      console.warn('invalid leave state?',s)
  }
  for(var i=0; i < finder.enter.length; i+=2){
    var s = finder.enter[i]
      , p = finder.enter[i+1];
    if( s && typeof s.enter == 'function' )
      queue.push(emit('enter',s,p))
    else
      console.warn('invalid enter state?',s)
  }

  debug('queue',qs())
  if( !running ){
    running = true;
    next();
  }
}

function emit(event,state,path){
  var fn = state[event].bind(state);
  fn.event = event;
  fn.path = path;
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

  if( from === to ){
    debug('skipping %s -> %s because it\'s the same',from,to)
    return false
  }

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

  debug('paths',paths)
  debug('from "%s"',from,frParts)
  debug('to "%s"',to,toParts)
  debug('lcd',lcd)

  // from - lcd = leave
  for(var f=frParts.length; f > lcd ; f--){
    var path = frParts.slice(0,f).join('/');
    if( paths[path] ){
      debug('adding to leave',path)
      for(var i=0; i<paths[path].length; i++){
        leave.push(paths[path][i],path)
      }
    }
  }

  // special case for the initial see()
  if( !from && paths['/'] ){
    for(var i=0; i<paths['/'].length; i++){
      enter.push(paths['/'][i],'/')
    }
  }

  // to - lcd = enter
  for(var t=lcd; t < toParts.length; t++){
    var path = toParts.slice(0,t+1).join('/');
    if( paths[path] ){
      debug('adding to enter',path)
      for(var i=0; i<paths[path].length; i++){
        enter.push(paths[path][i],path)
      }
    }
  }

  debug('entering: %s leaving: %s',enter.length, leave.length)

  return enter.length > 0 || leave.length > 0;
}

function normalize(path){
  // TODO ("../" "./" "/" "//")
  return path || '';
}

var supportsConfigurable = (function(){
  var x={};
  Object.defineProperty(x,'x',{value:123,configurable:true});
  Object.defineProperty(x,'x',{value:456,configurable:true});
  return x.x === 456;
})()

function updateContext(path){
  var i = path.indexOf('?');
  if( !supportsConfigurable ){
    context.path = path
    context.pathname = ~i ? path.slice(0, i) : path
    context.querystring = ~i ? path.slice(i + 1) : ''
  } else {
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
}

// execute async or sync
function next(err){
  var fn;
  if( err instanceof Error ){
    see.emit('error',err);

  } else if( fn = queue.shift() ){

    // update the context path data
    updateContext(fn.path);

    // emit "enter"
    if( fn.event == 'enter' ){
      see.emit('enter',context)

      // aborted? stop after "enter" to avoid
      // getting stuck in between states.
      if( aborted ){
        console.log('aborted! clearing the rest of the queue',qs())
        // removing all in queue up until when the aborted was called
        var i = queue.indexOf(aborted);
        queue.splice(0,i);
        console.log('after the splice',qs())
        aborted = null;
      }
    }


    // async
    if( fn.length >= 2 ){
      debug('async %s %s',fn.event,fn.path)
      fn(context,function(err){
        // emit "leave"
        if( fn.event == 'leave' ){
          see.emit('leave',context)
        }
        next(err)
      });

    // sync
    } else {
      debug('sync %s %s',fn.event,fn.path)
      fn(context)
      // emit "leave"
      if( fn.event == 'leave' ){
        see.emit('leave',context)
      }
      next()
    }
  } else {
    // done!
    debug('done! no more states')
    running = false;
  }
}

function qs(){
  var s = [];
  for(var i=0; i<queue.length;i++){
    var q = queue[i];
    s.push(q.event + ' ' + q.path)
  }
  return '\n\t' + s.join('\n\t');
}