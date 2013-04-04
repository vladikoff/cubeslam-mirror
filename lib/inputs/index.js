var debug = require('debug')('inputs:core')
  , Emitter = require('emitter')
  , network = require('./network')
  , types = require('./types')
  , actions = require('../actions')
  , str = types.toString;

var buffer = [] // keeps the recorded inputs
  , slice = [].slice;

Emitter(exports);

exports.types = types;
exports.network = network;

// TODO reset?

exports.record = function(){
  debug('record',str(arguments))

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
  world.multiplayer && network.send(buffer)

  // execute and enqueue the inputs
  for(var i=0; i<buffer.length; i++){
    // execute inputs locally
    execute(world,buffer[i]);

    // TODO enqueue locally (for a potential replay)
    // world.multiplayer && network.enqueue(queues.loc,world.frame,buffer[i])
  }

  // reset buffer
  buffer.length = 0;
}

exports.info = function(ctx){
  return 'Inputs (TODO)'
}

function execute(world,input){
  debug('execute %s %s',world.name,world.frame,str(input))
  switch(input[0]){
    case types.MOVE:  return actions.movePaddle(world,input[1],input[2])
    case types.HIT:   return actions.roundOver(world,input[1])
  }
}

