

exports.MOVE = 0;
exports.HIT = 1;

exports.validate = function(input){
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