var debug = require('debug')('history');

module.exports = History;

History.MAX_HISTORY = 30;

function History(){
  this.stack = []
  this.frames = {}
}

History.prototype = {

  // records the worlds current state
  save: function(world){
    var state = {}; // TODO Pool these (it will take an insane amount!)
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
        case 'extras':
        case 'forces':
        case 'players':
        case 'paddles':
          // only a special case in restore()

        default:
          if( world.hasOwnProperty(k) )
            state[k] = world[k]
      }
    }

    // store the stack index to this world frame
    this.frames[''+world.frame] = this.stack.length;

    // push JSON to `this.stack` 
    // using JSON as it's a simple way to serialize everything into 
    // their own objects without looping and copying (well, at least 
    // not explicitly).
    var json = JSON.stringify(state);
    this.stack.push(json);
    debug('saved frame',world.frame)
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
        case 'players':
        case 'paddles':
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

    // TODO clean out the states before `index` (and don't forget to update `this.frames`)

    debug('restored frame',frame)
  }

}

// recursively update the properties of `obj` 
// based on the properties of `src`.
function updateProperties(src,obj){
  for(var k in src){
    if( Array.isArray(src[k]) || typeof src[k] == 'object' )
      updateProperties(src[k],obj[k]);
    else
      obj[k] = src[k]
  }
}
