var debug = require('debug')('inputs:types');

exports.PONG = -2;
exports.PING = -1;
exports.MOVE = 1;
exports.DIED = 2; // player has been hit
exports.HIT  = 3; // paddle has been hit
exports.MISS = 4; // shield has been hit

exports.execute = execute;
exports.validate = validate;
exports.toString = str;

function str(input){
  switch(input[0]){
    case exports.PING: return 'PING('+input[1]+')';
    case exports.PONG: return 'PONG('+input[1]+')';
    case exports.MOVE: return 'MOVE('+input[1]+','+input[2]+')';
    case exports.DIED: return 'DIED('+input[1]+','+input[2]+')';
    case exports.MISS: return 'MISS('+input[1]+')';
    case exports.HIT:  return  'HIT('+input[1]+','+input[2]+')';
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
  switch(input && input[0]){
    case exports.HIT:  // paddle position, paddle velocity
    case exports.MOVE: // id, movement
    case exports.DIED: // id, puck position
      return input.length == 3;

    case exports.MISS: // paddle position
    case exports.PING: // id
    case exports.PONG: // id
      return input.length == 2;

  }
  return false;
}

function execute(world,input){
  debug('execute %s %s',world.name,world.frame,world.state,str(input))
  switch(input[0]){
    case exports.MOVE:  return require('../actions').movePaddle(world,input[1],input[2])
    case exports.DIED:  return require('../actions').roundOver(world,input[1],input[2])
    case exports.HIT:   throw new Error('cannot execute HIT');
    case exports.MISS:  throw new Error('cannot execute MISS');
    case exports.PING:  throw new Error('cannot execute PING');
    case exports.PONG:  throw new Error('cannot execute PONG');
  }
}