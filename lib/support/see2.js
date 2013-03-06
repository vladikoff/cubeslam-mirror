var Emitter = require('emitter'+(typeof process == 'undefined' ? '' : '-component'))
  , debug = require('debug')('see');

module.exports = Emitter(see);

var stack = []    // current active states
  , queue = []    // next targets
  , target        // current target
  , current = []  // current path
  , states = {}   // available states
  , context = {}
  , running = false;

// see(path,state)
// see(path)
function see(path,state){
  // create - see(path,state)
  if( arguments.length == 2 ){
    if( typeof state != 'object' || !state ){
      throw new ArgumentError('state must be an object');
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
  debug('abort',qs())
}

see.ctx = function(ctx){
  context = ctx;
}

see.go = function(path){
  console.log('go(%s)',path)

  path = normalize(path);

  if( !states[path] )
    return console.error('path does not exist: %s',path)

  // add to queue
  queue.push(path);

  // go only if queue was empty
  // (or we'll have parallel states running)
  running || nextInQueue()
}

function nextInQueue(){
  if( queue.length ){
    running = true;
    target = queue.shift().split('/');
    console.log('nextInQueue',target)
    go()

  } else {
    // done!
    console.log('nextInQueue (done!)')
    running = false;
  }
}

// returns 1 / -1 / 0
// depending on if it matches
function diff(){
  var t = target.join('/')
    , c = current.join('/');

  console.log('diff',c,t)

  // if shorter and they match so far
  if( current.length < target.length && t.indexOf(c) == 0 ){
    return +1;
  }

  // if longer or they don't match so far
  if( current.length > target.length || t.indexOf(c) != 0 ){
    return -1;
  }

  return 0;
}

function go(){
  switch(diff()){
    case 1: // push
      current.push(target[current.length])
      console.log('push',current)
      updateContext(current.join('/'))
      return push()

    case -1: // pop
      updateContext(current.join('/'))
      current.pop()
      console.log('pop',current)
      return pop()

    case 0: // done
      see.emit(target.join('/'))
      return nextInQueue()
  }
}

function pop(){
  var state = stack.pop();

  // run
  if( state && typeof state.leave == 'function' ){
    // async
    if( state.leave.length >= 2 ){
      console.log('pop() async',state)
      state.leave(context,function(err){
        if( err instanceof Error ){
          see.emit('error',err);
        } else {
          go();
        }
      })

    // sync
    } else {
      console.log('pop() sync',state)
      state.leave(context);
      go();
    }

  // no leave
  } else if(state){
    console.log('pop() no leave',state)
    go();

  // no more states
  } else {
    go()
  }
}


function push(){
  var state = nextMatchingState();

  // run
  if( state && typeof state.enter == 'function' ){
    // async
    if( state.enter.length >= 2 ){
      console.log('push() async',state)
      state.enter(context,function(err){
        if( err instanceof Error ){
          see.emit('error',err);
        } else {
          stack.push(state)
          push();
        }
      })

    // sync
    } else {
      console.log('push() sync',state)
      state.enter(context);
      stack.push(state)
      push();
    }

  // no enter
  } else if( state ){
    console.log('push() no enter')
    push()

  // no more states
  } else {
    go()
  }
}


// find a matching state
function nextMatchingState(){
  var path = current.join('/') || '/';
  console.log('nextMatchingState()',path,states[path])
  if( states[path] ){
    for(var i=0; i < states[path].length; i++){
      if( !~stack.indexOf(states[path][i]) ){
        return states[path][i];
      } else {
        console.log('already in stack?',states[path][i],stack)
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