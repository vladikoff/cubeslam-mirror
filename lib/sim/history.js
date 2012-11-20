

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
    var json = JSON.stringify(state);
    this.stack.push(json);
    // console.log(json)

  },

  // unwinds the stack until it meets a world state with 
  // the same frame number (or less)
  restore: function(frame,world){
    var index = this.frames[''+frame];

    if( !this.stack[index] )
      throw new Error('tried to restore an unsaved frame: '+frame);

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
          // special case, only update the instances
          for( var p in state[k] ){ // ex. players.a (already exist in world)
            if( !world[k][p] ){
              // uh ohs!
              console.log('could not find %s.%s in current world',k,p)
            }
            for( var x in state[k][p] ) // ex. players.a.paddle (already exist, but update)
              world[k][p][x] = state[k][p][x];
          }
          break;

        default:
          if( state.hasOwnProperty(k) )
            world[k] = state[k];
      }
    }

    // TODO clean out the states before `index` (and don't forget to update `this.frames`)

  }

}
