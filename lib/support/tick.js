
module.exports = Tick;

var TIMEOUT = 0
  , INTERVAL = 1;

var TIMEOUT_LEN = 5
  , ADDED_LEN = 4;

function Tick(framerate){
  this.framerate = framerate || 60/1000; // in ms

  this._timeouts = [];
  this._added = [];
  this._index = 1;
}

Tick.prototype.nextFrame = function(fn){
  return this.setTimeout(fn,1);
}

Tick.prototype.setTimeout = function(fn,ms){
  // 500ms = 30frames
  var frames = Math.round(ms*this.framerate) || 1;
  var id = this._index++;
  this._added.push(id,fn,frames,TIMEOUT);
  return id;
}

Tick.prototype.clearTimeout = function(id){
  return outOfRange(id,this._index)
      || clearAdded(id,this._added,TIMEOUT)
      || clearTimeouts(id,this._timeouts,TIMEOUT)
}

Tick.prototype.setInterval = function(fn,ms){
  // 500ms = 30frames
  var frames = Math.round(ms*this.framerate) || 1;
  var id = this._index++;
  this._added.push(id,fn,frames,INTERVAL);
  return id;
}

Tick.prototype.clearInterval = function(id){
  return outOfRange(id,this._index)
      || clearAdded(id,this._added,INTERVAL)
      || clearTimeouts(id,this._timeouts,INTERVAL)
}

Tick.prototype.update = function(world){
  checkForAdded(world.frame,this._added,this._timeouts)
  checkForActive(world.frame,this._added,this._timeouts)
}

Tick.prototype.reset = function(){
  console.log('reset')
  this._timeouts.length = 0;
  this._added.length = 0;
}

function checkForAdded(frame,added,timeouts){
  while(added.length){
    var id = added.shift()
      , fn = added.shift()
      , fr = added.shift()
      , to = added.shift()
      , ti = frame + fr;

    // console.log('added timeout id:%s frames: %s type: %s active: %s',id,fr,to,ti)

    timeouts.push(ti,id,fr,fn,to);
  }
}

function checkForActive(frame,added,timeouts){
  // loop from back
  for(var i=timeouts.length-TIMEOUT_LEN; i>=0; i-=TIMEOUT_LEN) {
    var ti = timeouts[i];

    if( ti === frame ) {
      var id = timeouts[i+1]
        , fr = timeouts[i+2]
        , fn = timeouts[i+3]
        , to = timeouts[i+4]

      // console.log('active timeout id:%s type: %s frame: %s',id,to,frame)

      // call
      fn();

      // remove from list
      timeouts.splice(i,TIMEOUT_LEN);

      // re-add when interval
      if( to === INTERVAL ){
        // console.log('re-added timeout id:%s frames: %s type: %s active: %s',id,ti,to,frame+ti)
        timeouts.push(frame+fr,id,fr,fn,to);
      }
    }
  }
}

function outOfRange(id,index){
  return id >= index;
}

function clearAdded(id,added,type){
  for(var i=added.length; i>=0; i -= ADDED_LEN){
    if( added[i] === id && added[i+3] === type ){
      // console.log('clear added',id)
      added.splice(i,ADDED_LEN);
      return true;
    }
  }
}

function clearTimeouts(id,timeouts,type){
  for(var i=timeouts.length-TIMEOUT_LEN; i>=0; i -= TIMEOUT_LEN){
    if( timeouts[i] === id && timeouts[i+4] === type ){
      // console.log('clear timeout',id)
      timeouts.splice(i,TIMEOUT_LEN);
      return true;
    }
  }
}