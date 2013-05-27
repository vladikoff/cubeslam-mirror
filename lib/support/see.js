var Emitter = require('emitter'+(typeof process == 'undefined' ? '' : '-component'))
  , debug = require('debug')('see');

module.exports = Emitter(see);

var stack = []    // current active states
  , queue = []    // next targets
  , target        // current target
  , current = []  // current path
  , states = {}   // available states
  , lookup = []   // connects stack indexes/paths to states
  , active        // the currently active state (esp. during async)
  , bound = {}    // cache of bound functions
  , context = {}
  , running = false;

// see(path,state)
// see(path)
function see(path,state){
  // create - see(path,state)
  if( arguments.length == 2 ){
    if( typeof state != 'object' || !state ){
      throw new Error('state must be an object');
    }

    path = normalize(path)
    debug('create',path,[state])
    if( !states[path] ){
      states[path] = [state];
    } else {
      states[path].push(state);
    }

  // go - see(path)
  } else {
    debug('go',path)
    see.go(path || '/')

  }
}

see.abort = function(){
  debug('abort',queue,stack,active)

  // clear queue
  queue.length = 0

  // cleanup active
  if( active ){
    see.emit('leave',context);
    active.cleanup && active.cleanup(context);
    active = null;
  }

  // start again on next see()
  running = false;
}

see.ctx = function(ctx){
  context = ctx;
}

see.go = function(path){
  debug('go',path)

  path = normalize(path);

  if( !states[path] ){
    throw new Error('path does not exist: '+path);
  }

  // add to queue
  queue.push(path);

  // go only if queue was empty
  // (or we'll have parallel states running)
  running || nextInQueue()
}

/**
 * Binds a see(path) call for an event listener.
 *
 * Only creates a single bound function per path
 * so that it can easily be removed from the event
 * listener again.
 *
 * Example:
 *
 *    emitter.on('go',see.bind('/to/here'))
 *    emitter.off('go',see.bind('/to/here'))
 *
 * @param  {String} path
 * @return {Function} bound to see.go(path)
 */
see.bind = function(path){
  return bound[path] || (bound[path] = see.go.bind(see,path));
}

function nextInQueue(){
  if( queue.length ){
    running = true;
    target = queue.shift().split('/');
    go()

  } else {
    // done!
    debug('done')
    running = false;
  }
}

// returns 1 / -1 / 0
// depending on if it matches
function diff(){
  var t = str(target)
    , c = str(current)
    , l = stack[stack.length-1];

  debug('diff',t,c,l)

  // if already there
  if( t === c ){
    return 0;
  }

  // if shorter and they match so far
  if( current.length < target.length && t.indexOf(c) === 0 ){
    return +1;
  }

  // if it doesn't match what's in the stack
  if( l && l.indexOf(c) !== 0 ){
    return -2;
  }

  // if longer or they don't match so far
  if( current.length > target.length || t.indexOf(c) !== 0 ){
    return -1;
  }

  return 0;
}

function go(){
  switch(diff()){
    case 1: // push
      current.push(target[current.length])
      updateContext(str(current))
      return push()

    case -1: // pop
      updateContext(str(current))
      current.pop()
      return pop()

    case -2: // pop without touching the stack
      current.pop()
      return go();

    case 0: // done
      see.emit(str(target))
      return nextInQueue()
  }
}

function pop(){
  var pathname = stack.pop()
    , nextpath = stack[stack.length-1]
    , state = lookup.pop()
    , next = nextpath === pathname ? pop : go;

  // mark state as active
  active = state;

  // run
  if( state && typeof state.leave == 'function' ){
    // async
    if( state.leave.length >= 2 ){
      debug('pop async',context.pathname)
      state.leave(context,function(err){
        if( err instanceof Error ){
          see.emit('error',err);
        } else {
          see.emit('leave',context);
          state.cleanup && state.cleanup(context);
          active = null;
          next();
        }
      })

    // sync
    } else {
      debug('pop sync',context.pathname)
      state.leave(context);
      see.emit('leave',context);
      state.cleanup && state.cleanup(context);
      active = null;
      next();
    }

  // no leave
  } else if(state){
    debug('pop no leave',context.pathname)
    see.emit('leave',context);
    state.cleanup && state.cleanup(context);
    active = null;
    next();

  // no more states
  } else {
    next();
  }
}


function push(){
  var state = nextMatchingState();

  // mark state as active
  active = state;

  // run
  if( state && typeof state.enter == 'function' ){
    // async
    if( state.enter.length >= 2 ){
      debug('push async',context.pathname)
      see.emit('enter',context);
      state.enter(context,function(err){
        active = null;
        if( err instanceof Error ){
          see.emit('error',err);
        } else {
          stack.push(context.pathname)
          lookup.push(state)
          push();
        }
      })

    // sync
    } else {
      debug('push sync',context.pathname)
      see.emit('enter',context);
      state.enter(context);
      active = null;
      stack.push(context.pathname)
      lookup.push(state)
      push();
    }

  // no enter
  } else if( state ){
    debug('push no enter',context.pathname)
    see.emit('enter',context);
    active = null;
    push()

  // no more states
  } else {
    go()
  }
}

function str(path){
  return path.join('/') || '/';
}

// find a matching state
function nextMatchingState(){
  var path = str(current);
  // console.log('nextMatchingState()',path,states[path])
  if( states[path] ){
    for(var i=0; i < states[path].length; i++){
      if( !~lookup.indexOf(states[path][i]) ){
        return states[path][i];
      } else {
        // console.log('already in stack?',states[path][i],stack)
      }
    }
  }
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

function normalize(path){
  // TODO ("../" "./" "/" "//")
  return path || '';
}