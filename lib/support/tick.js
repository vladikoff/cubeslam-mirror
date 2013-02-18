
exports.framerate = 60/1000; // in ms

var timeouts = []
  , added = []
  , index = 0;

var TIMEOUT = 0
  , INTERVAL = 1;

exports.nextFrame = function(fn){
  return exports.setTimeout(fn,1);
}

exports.setTimeout = function(fn,ms){
  // 500ms = 30frames
  var frames = Math.round(ms*exports.framerate) || 1;
  var id = index++;
  added.push(id,fn,frames,TIMEOUT);

  return id;
}

exports.clearTimeout = function(id){
  return outOfRange(id)
      || clearAdded(id,TIMEOUT)
      || clearTimeouts(id,TIMEOUT)
}

exports.setInterval = function(fn,ms){
  // 500ms = 30frames
  var frames = Math.round(ms*exports.framerate) || 1;
  var id = index++;
  added.push(id,fn,frames,INTERVAL);
  return id;
}

exports.clearInterval = function(id){
  return outOfRange(id)
      || clearAdded(id,INTERVAL)
      || clearTimeouts(id,INTERVAL)
}

exports.update = function(world){

  checkForAdded(world.frame)
  checkForActive(world.frame)

}

exports.reset = function(){
  timeouts.length = 0;
  added.length = 0;

}

function checkForAdded(frame){
  var needSort = false;
  while(added.length){
    needSort = true;
    var id = added.shift()
      , fn = added.shift()
      , fr = added.shift()
      , to = added.shift()

    //console.log('added timeout',id,fr,to,frame+fr-1)

    timeouts.push(frame+fr-1,id,fn,to);
  }

  if( needSort ){
    // TODO how to sort [frame,callback...] on frame?
  }
}

function checkForActive(frame){
  
  //loop from back
  for(var i=timeouts.length-4; i>=0; i-=4) {

    if( timeouts[i] === frame ) {

      timeouts[i+2]();
      
      // re-add intervals
      if( timeouts[i+3] === INTERVAL ) added.push(timeouts[i+1],timeouts[i+2],timeouts[i+0]-frame,0);

      //remove from list
     timeouts.splice(i,4);

    }  
  }

  /*while(timeouts[0] === frame){
    var fr = timeouts.shift()
      , id = timeouts.shift()
      , fn = timeouts.shift()
      , to = timeouts.shift() // timeout=1 / interval=0

    fn();

    // re-add intervals
    if( to === INTERVAL ) added.push(id,fn,fr-frame,0);
  }*/
}

function outOfRange(id){
  return id >= index;
}

function clearAdded(id,type){
  for(var i=0; i<added.length; i += 4){
    if( added[i] === id && added[i+3] === type ){
      added.splice(i,4);
      return true;
    }
  }
}

function clearTimeouts(id,type){
  for(var i=0; i<timeouts.length; i += 4){
    if( timeouts[i] === id && timeouts[i+3] === type ){
      timeouts.splice(i,4);
      return true;
    }
  }
}