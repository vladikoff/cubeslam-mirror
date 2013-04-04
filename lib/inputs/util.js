var World = require('../world')
  , join = [].join;

// converts an ArrayBuffer to a string
exports.ab2s = function(buf){
  return join.call(new Uint8Array(buf));
}


// used as JSON replacer to
// find undefined values and
// remove excluded keys
exports.unhide = function(k,v){
  if( ~World.EXCLUDED.indexOf(k) )
    return undefined;
  if( typeof v == 'undefined' )
    return 'undefined'
  return v;
}