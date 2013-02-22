var World = require('../world')

module.exports = Queue;

function Queue(){
  this.lastFrame = 0;
}
Queue.prototype = new Array;
Queue.prototype.push = function(frame,type){
  // assumes first argument is frame
  // save it to make sure no one attempts
  // to store an earlier frame
  if( frame < this.lastFrame && type !== World.ACK ){
    throw new Error('invalid frame order. input queue will be borked.');
  }
  this.lastFrame = frame;
  return Array.prototype.push.apply(this,arguments);
}
Queue.prototype.reset = function(){
  this.length = 0;
  this.lastFrame = 0;
}
