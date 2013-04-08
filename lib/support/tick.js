var debug = require('debug')('tick')
  , actions = require('../actions')
  , settings = require('../settings');

module.exports = Tick;

var TIMEOUT = 0
  , INTERVAL = 1;

var TIMEOUT_LEN = 6
  , ADDED_LEN = 5;
var slice = [].slice;

function Tick(){
  this._timeouts = [];
  this._added = [];
  this._index = 1;
}

Tick.prototype.nextFrame = function(action){
  if( typeof actions[action] != 'function' )
    return console.warn('invalid action "%s"',action)
  var id = this._index++;
  debug('nextFrame(%s) %s',action,id)
  this._added.push(id,action,slice.call(arguments,1),0,TIMEOUT);
  return id;
}

Tick.prototype.setTimeout = function(action,ms){
  if( typeof actions[action] != 'function' )
    return console.warn('invalid action "%s"',action)
  var id = this._index++;
  var frames = msToFrames(ms);
  debug('setTimeout(%s) %s (%s frames)',action,id,frames)
  this._added.push(id,action,slice.call(arguments,2),frames,TIMEOUT);
  return id;
}

Tick.prototype.clearTimeout = function(id){
  debug('clearTimeout %s',id)
  return outOfRange(id,this._index)
      || clearAdded(id,this._added,TIMEOUT)
      || clearTimeouts(id,this._timeouts,TIMEOUT)
}

Tick.prototype.setInterval = function(action,ms){
  if( typeof actions[action] != 'function' )
    return console.warn('invalid action "%s"',action)
  var id = this._index++;
  var frames = msToFrames(ms);
  debug('setInterval(%s) %s (%s frames)',action,id,frames)
  this._added.push(id,action,slice.call(arguments,2),frames,INTERVAL)
  return id;
}

Tick.prototype.clearInterval = function(id){
  debug('clearInterval %s',id)
  return outOfRange(id,this._index)
      || clearAdded(id,this._added,INTERVAL)
      || clearTimeouts(id,this._timeouts,INTERVAL)
}

Tick.prototype.update = function(world){
  checkForAdded(world.frame,this._added,this._timeouts)
  checkForActive(world,this._added,this._timeouts)
}

Tick.prototype.reset = function(){
  this._timeouts.length = 0;
  this._added.length = 0;
  this._index = 1;
}

function checkForAdded(frame,added,timeouts){
  while(added.length){
    var id = added.shift()
      , action = added.shift()
      , args = added.shift()
      , frames = added.shift()
      , type = added.shift()
      , when = frame + frames;
    timeouts.push(when,id,frames,action,args,type);
  }
}

function checkForActive(world,added,timeouts){
  var frame = world.frame;
  // loop from back for easy splice
  for(var i=timeouts.length-TIMEOUT_LEN; i>=0; i-=TIMEOUT_LEN) {
    var when = timeouts[i];

    if( when === frame ) {
      var id = timeouts[i+1]
        , frames = timeouts[i+2]
        , action = timeouts[i+3]
        , args = timeouts[i+4]
        , type = timeouts[i+5];

      // remove from list
      timeouts.splice(i,TIMEOUT_LEN);

      // re-add when interval
      if( type === INTERVAL ){
        timeouts.push(frame+frames,id,frames,action,args,type);
      }

      // call
      actions[action].apply(actions,[world].concat(args));
    }
  }
}

function outOfRange(id,index){
  return typeof id == 'number'
      && id >= index;
      // TODO can we check if id is lower than the lowest "active"?
}

function clearAdded(id,added,type){
  for(var i=added.length; i>=0; i -= ADDED_LEN){
    if( added[i] === id && added[i+4] === type ){
      added.splice(i,ADDED_LEN);
      return true;
    }
  }
}

function clearTimeouts(id,timeouts,type){
  for(var i=timeouts.length-TIMEOUT_LEN; i>=0; i -= TIMEOUT_LEN){
    if( timeouts[i+1] === id && timeouts[i+5] === type ){
      timeouts.splice(i,TIMEOUT_LEN);
      return true;
    }
  }
}

function msToFrames(ms){
  // 60/1000 = 0.06
  // 100ms * 0.06 = 6 frames
  return Math.round(ms*settings.data.framerate/1000) || 1;
}