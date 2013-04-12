var debug = require('debug')('inputs:types');

exports.MOVE = 1;
exports.HIT = 2;
exports.EMIT = 3;

exports.execute = execute;
exports.validate = validate;
exports.toString = str;

function str(input){
  switch(input[0]){
    case exports.MOVE: return 'MOVE('+input[1]+','+input[2]+')';
    case exports.HIT:  return 'HIT('+input[1]+','+input[2]+')';
    case exports.EMIT: return 'EMIT('+input[1]+','+input[2]+')';
    default:
      // assumes the input is an array of inputs
      if( Array.isArray(input) ){
        return input.map(str).join(' | ')
      } else {
        return 'invalid input!'
      }
  }
}

function validate(input){
  var valid = true;
  switch(input[0]){
    case exports.EMIT: // id, x
    case exports.MOVE: // id, x
    case exports.HIT:
      if( input.length !== 3 ){
        valid = false;
      }
      break;
    default:
      valid = false;
  }
  return valid;
}


function execute(world,input){
  debug('execute %s %s',world.name,world.frame,world.state,str(input))
  switch(input[0]){
    case exports.EMIT:  throw new Error('cannot execute EMIT');
    case exports.MOVE:  return require('../actions').movePaddle(world,input[1],input[2])
    case exports.HIT:   return require('../actions').roundOver(world,input[1],input[2])
  }
}