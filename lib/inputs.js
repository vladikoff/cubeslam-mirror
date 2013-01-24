var debug = require('debug')('inputs')
  , World = require('./world');


module.exports = Inputs;

function Inputs(){
  this.history = []
  this.frames = []
  this.current = []
}

Inputs.prototype.append = function(frame,inputs){
  this.history.push.apply(this.history,inputs);
  this.frames.push(frame,inputs.length);
}

// fn(type[,args...])
Inputs.prototype.read = function(frame,fn){
  var history = this.history
    , frames = this.frames;
  for(var f=0, i=0; f < frames.length; f+=2){
    var index = frames[f]
      , length = frames[f+1];
    if( index === frame ){
      var inputStart = i
        , inputEnd = i+length;

      for(var n=inputStart; n < inputEnd; n++){
        var type = history[n];
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
    } else if( index > frame ){
      break;
    }
    i += length;
  }
}

// inserting to history (from, say, the network):
// - linear search to find frame
// - add new input length to frame length
// - splice in the input into the history
Inputs.prototype.insert = function(frame,inputs){
  var frames = this.frames;
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

Inputs.prototype.apply = function(world,timestep,time){
  debug('apply',world.frame,this.current.length)
  for(var i=0; i < this.current.length;){
    var type = this.current[i++];
    switch(type){
      case World.MOVE:
        var dx = this.current[i++];
        var p = world.paddles.get(world.me.paddle);
        p.current[0] += dx || 0;
        break;
      case World.SHOOT:
        console.log('shooting! frame: %s',world.frame)
        // TODO create a bullet
        break;
      case World.PAUSE:
        world.paused = true;
        break;
      case World.PLAY:
        world.paused = false;
        break;
      case World.OVER:
        world.over = true;
        break;
      default:
        console.warn('input not implemented (aborting):',type);
        return;
    }
  }
  // store all inputs that happened this frame in history
  this.append(world.frame,this.current)
  this.reset(world);
}

Inputs.prototype.reset = function(world){
  debug('reset',world.frame)
  this.current.length = 0;
}