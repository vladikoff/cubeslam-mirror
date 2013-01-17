var World = require('./world');


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
        , inputEnd = i+length
      // , input = history.slice(inputStart,inputEnd);
      // slice not necessary, better to just read
      // input directly:
      for(var n=inputStart; n < inputEnd; n++){
        var type = history[n];
        switch(type){
          case 0: // move(dx,dy,dt)
            fn(type,history[n++],history[n++],history[n++])
            break;
          case 1: // shoot
          case 2: // pause
          case 3: // play
          case 4: // over
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

Inputs.prototype.record = function(type /*, args...*/){
  // TODO package as Command and send to a network buffer?
  //      or should this be hooked onto game.on('input')?
  this.current.push.apply(this.current,arguments);
}

Inputs.prototype.apply = function(world,timestep,time){
  for(var i=0; i < this.current.length;){
    var type = this.current[i++];
    switch(type){
      case World.MOVE:
        var dx = this.current[i++] || 0;
        var p = world.paddles.get(world.me.paddle);
        p.current[0] += dx;
        break;
      case World.SHOOT:
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
}

Inputs.prototype.reset = function(){
  this.current.length = 0;
}