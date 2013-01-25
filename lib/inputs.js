var debug = require('debug')('inputs')
  , World = require('./world');


module.exports = Inputs;

function Inputs(){
  this.history = []
  this.frames = []
  this.current = []
}

Inputs.prototype.reset = function(){
  this.history.length = 0;
  this.frames.length = 0;
  this.current.length = 0;
}

Inputs.prototype.append = function(frame,inputs){
  if( !inputs.length ) return;
  this.history.push.apply(this.history,inputs);
  var lastFrame = this.frames[this.frames.length-2] || -1;
  if( lastFrame === frame ){
    this.frames[this.frames.length-1] += inputs.length;
  } else if( lastFrame < frame ){
    this.frames.push(frame,inputs.length);
  } else {
    throw new Error('cannot append before the last frame (use insert)')
  }
}

/**
 * I'd like to be able to
 * "play game from state with these inputs to this frame"
 * ex.
 *   var inputs = new Inputs()
 *   inputs.readFrom(0,100,[ctx.game.inputs,ctx.networkGame.inputs])
 *   ctx.game.replay(ctx.initial.world,inputs,150) // extrapolating 50 frames
 */
Inputs.prototype.readFrom = function(start,end,inputs){
  if( typeof start != 'number' )
    throw new ArgumentError('start must be number')
  if( typeof end != 'number' )
    throw new ArgumentError('end must be number')
  if( !Array.isArray(inputs) )
    throw new ArgumentError('inputs must be array')
  if( start > end )
    throw new ArgumentError('start must be before end');
  var arr = [];
  for(var i=start; i < end; i++){
    for(var x=0; x < inputs.length; x++){
      inputs[x].read(i,arr);
      this.append(i,arr);
      arr.length = 0;
    }
  }
}

/**
 * Reads the input history between `from` (incl) and
 * `to` (incl) and if `out` is a function it will call
 * `out(type[,args...])` for each input. If it's an
 * array is will add them to that array. Otherwise it
 * will throw an error.
 *
 * @param  {Number} from
 * @param  {Number} to
 * @param  {Array}  out
 * @param  {Object} ctx will have `frame` & `index`
 * @return {Inputs}
 */
Inputs.prototype.read = function(from, out, ctx){
  var history = this.history
    , frames = this.frames
    , ctx = ctx || {frame: 0, index: 0};

  if( Array.isArray(out) )
    fn = out.push.bind(out);

  else
    throw new Error('`out` is expected to be Array or Function');

  for(var f=ctx.frame, i=ctx.index; f < frames.length; f+=2){
    var frame = frames[f]
      , length = frames[f+1];
    if( frame === from ){
      var inputStart = i
        , inputEnd = i+length
        , n = inputStart;
      while(n < inputEnd){
        var type = history[n++];
        switch(type){
          case World.MOVE:
            fn(type,history[n++])
            break;
          case World.SHOOT:
          case World.PAUSE:
          case World.PLAY:
          case World.OVER:
            fn(type)
            break;
          default:
            throw new ArgumentError('invalid input type: '+type);
        }
      }
    } else if( frame > from ){
      ctx.frame = f;
      ctx.index = i;
      return;
    }
    i += length;
  }
}

// inserting to history (from, say, the network):
// - linear search to find frame
// - add new input length to frame length
// - splice in the input into the history
Inputs.prototype.insert = function(frame,inputs){
  var frames = this.frames
    , history = this.history;
  for(var f=0, i=0; f < frames.length; f+=2){
    var index = frames[f]
      , length = frames[f+1];
    if( index === frame ){
      history.splice(i,0,inputs) // insert into history
      frames[f+1] = length + inputs.length; // grow frame
    } else if( index > frame ){
      break;
    }
    i += length;
  }
}

Inputs.prototype.record = function(type,a,b,c){
  debug('record',type)
  switch(type){
    case World.MOVE:
      this.current.push(type,a);
      break;
    case World.SHOOT:
    case World.PAUSE:
    case World.PLAY:
    case World.OVER:
      this.current.push(type);
      break;
    default:
      throw new Error('invalid input',arguments);
  }
}
