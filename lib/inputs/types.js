

exports.MOVE = 0;
exports.HIT = 1;

exports.validate = validate;
exports.toString = str;

function str(input){
  switch(input[0]){
    case exports.MOVE:       return 'MOVE('+input[1]+','+input[2]+')';
    case exports.HIT:        return 'HIT('+input[1]+')';
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
    case exports.MOVE: // id, x
      if( input.length !== 3 ){
        valid = false;
      }
      break;
    case exports.HIT: // id
      if( input.length !== 2 ){
        valid = false;
      }
      break;
    default:
      valid = false;
  }
  return valid;
}