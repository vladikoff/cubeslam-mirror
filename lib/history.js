var debug = require('debug')('history')
  , pool = require('./pool');

module.exports = History;

History.MAX_HISTORY = 30;

function History(){
  this.index = 0;
  this.stack = new Array(History.MAX_HISTORY)
  this.frames = {}
}

History.prototype = {

  // records the worlds current state
  save: function(world){
    var state = State.alloc();
    for(var k in world){
      switch(k){

        case 'me':
        case 'opponent':
          // special case, references to other parts of the world...
          state[k] = world[k] === world.players.a ? 'a' : 'b';
          break;

        case 'host':
        case 'renderer':
        case 'bounds':
          // special case, not stored in state
          break;

        case 'pucks':
        case 'bodies':
        case 'extras':
        case 'forces':
        case 'players':
        case 'paddles':
        case 'bullets':
        case 'obstacles':
        case 'activeExtras':
        case 'remove':
          // only a special case in restore()

        default:
          if( world.hasOwnProperty(k) )
            state[k] = world[k]
      }
    }

    var index = this.index;

    // check if this frame is already stored
    // (which happens after a rewind)
    // use the same index in that case
    if( this.frames[''+world.frame] ){
      index = this.frames[''+world.frame];

    // store the stack index to this world frame
    // and loop the index
    } else {
      this.frames[''+world.frame] = index;
      this.index = (this.index + 1) % History.MAX_HISTORY;
    }

    // push JSON to `this.stack`
    // using JSON as it's a simple way to serialize everything into
    // their own objects without looping and copying (well, at least
    // not explicitly).
    this.stack[index] = JSON.stringify(state);
    debug('saved frame',world.frame)
    State.free(state)
  },

  // unwinds the stack until it meets a world state with
  // the same frame number (or less)
  restore: function(frame,world){
    var index = this.frames[''+frame];

    // it's probably in the future, just log and ignore
    if( index === undefined || !this.stack[index] )
      return console.warn('frame %s not found in history',frame);

    // parse the state
    var state = JSON.parse(this.stack[index])

    // sanity check that the state frame is the right one
    if( state.frame !== frame )
      throw new Error('stack frame ('+state.frame+') did not match the one we tried to restore ('+frame+')')

    // apply the state to world
    for(var k in state){
      switch(k){
        case 'pucks':
        case 'extras':
        case 'forces':
        case 'bodies':
        case 'players':
        case 'paddles':
        case 'bullets':
        case 'obstacles':
        case 'activeExtras':
        case 'remove':
          // special case, only update the properties of the instances
          updateProperties(state[k],world[k])
          break;

        case 'me':
        case 'opponent':
          // special case, references to other parts of the world...
          world[k] = state[k] === 'a' ? world.players.a : world.players.b;
          break;

        default:
          if( state.hasOwnProperty(k) )
            world[k] = state[k];
      }
    }

    debug('restored frame',frame)
  }

}

// recursively update the properties of `obj`
// based on the properties of `src`.
function updateProperties(src,obj){
  for(var k in src){
    if( Array.isArray(src[k]) || typeof src[k] == 'object' )
      updateProperties(src[k],obj[k]);

    // skipping missing properties, if they're not there they will be added by an action (i hope)
    else if(obj)
      obj[k] = src[k]
  }
}


// Pool of state objects
function State(){}
State.prototype.destroy = function(){
  // remove any added properties/references
  for(var k in this)
    this[k] = null;
}
pool(State)