
module.exports = Tick;

var TIMEOUT = 0
  , INTERVAL = 1;

function Tick(framerate){
  this.framerate = framerate || 60/1000; // in ms

  this._timeouts = [];
  this._added = [];
  this._index = 0;
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
  this._timeouts.length = 0;
  this._added.length = 0;
}

function checkForAdded(frame,added,timeouts){
  while(added.length){
    var id = added.shift()
      , fn = added.shift()
      , fr = added.shift()
      , to = added.shift()

    //console.log('added timeout',id,fr,to,frame+fr-1)

    timeouts.push(frame+fr-1,id,fn,to);
  }
}

function checkForActive(frame,added,timeouts){

  // loop from back
  for(var i=timeouts.length-4; i>=0; i-=4) {

    if( timeouts[i] === frame ) {

      timeouts[i+2]();

      // re-add intervals
      if( timeouts[i+3] === INTERVAL )
        added.push(timeouts[i+1],timeouts[i+2],timeouts[i+0]-frame,0);

      //remove from list
      timeouts.splice(i,4);
    }
  }
}

function outOfRange(id,index){
  return id >= index;
}

function clearAdded(id,added,type){
  for(var i=0; i<added.length; i += 4){
    if( added[i] === id && added[i+3] === type ){
      added.splice(i,4);
      return true;
    }
  }
}

function clearTimeouts(id,timeouts,type){
  for(var i=0; i<timeouts.length; i += 4){
    if( timeouts[i] === id && timeouts[i+3] === type ){
      timeouts.splice(i,4);
      return true;
    }
  }
}