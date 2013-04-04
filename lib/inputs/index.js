var debug = require('debug')('inputs:core')
  , Emitter = require('emitter')
  , network = require('./network')
  , types = require('./types')
  , actions = require('../actions');

var buffer = []; // keeps the recorded inputs
  , slice = [].slice;

Emitter(exports);
asdasd
exports.types = types;

exports.record = function(){
  // validate input
  if( types.validate(arguments) ){
    // push the input into a temporary buffer
    buffer.push(slice.call(arguments))
  } else {
    console.warn('recorded invalid input:',arguments);
  }
}

exports.process = function(world){
  // send to network
  network.send(buffer)

  // execute and enqueue the inputs
  for(var i=0; i<buffer.length; i++){
    // execute each input on "game"
    // TODO skip unless MOVE? when sync?
    execute(world,buffer[i]);

    // enqueue locally
    enqueue(queues.loc,world.frame,buffer[i])
  }

  // reset buffer
  buffer.length = 0;
}
