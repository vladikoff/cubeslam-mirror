var debug = require('debug')('inputs:core')
  , Emitter = require('emitter')
  , network = require('./network')
  , types = require('./types')
  , buf = require('./buffer')
  , str = types.toString;

var buffer = [] // keeps the recorded inputs
  , slice = [].slice
  , hasPING = false
  , hasHIT = false;

Emitter(exports);

exports.types = types;
exports.network = network;

exports.reset = function(){
  buffer.length = 0;
  buf.reset()
  network.reset()
}

exports.record = function(type){
  debug('record',str(arguments))

  // validate input
  if( types.validate(arguments) ){

    // avoid multiple PINGs in buffer so we don't
    // get unnecessary 'message too long'-like
    // errors when being inactive.
    if( type === types.PING ){
      if( hasPING ){
        return;
      } else {
        hasPING = true;
      }
    }

    if( type === types.HIT ){
      if( hasHIT ){
        return;
      } else {
        hasHIT = true;
      }
    }


    // push the input into a temporary buffer
    buffer.push(slice.call(arguments))
  } else {
    console.warn('recorded invalid input:',arguments);
  }
}

exports.process = function(world){
  // send to network
  world.multiplayer && network.send(world.frame,buffer)

  // execute and enqueue the inputs
  for(var i=0; i<buffer.length; i++){
    var type = buffer[i][0];

    // skip PING/PONG/HIT/MISS, they should
    // only be sent over the network
    if( type === types.PING ) continue;
    if( type === types.PONG ) continue;
    if( type === types.MISS ) continue;
    if( type === types.HIT  ) continue;

    // enqueue for network replay
    // (do this first in case execute clears the buffer)
    world.multiplayer && network.enqueue(world.frame,buffer[i])

    // execute inputs locally
    types.execute(world,buffer[i]);
  }

  // reset buffer
  buffer.length = 0;
  hasPING = false;
  hasHIT = false;
}

exports.info = function(ctx){
  var info = network.info();
  info.recorded = buffer.length;
  return info;
}

