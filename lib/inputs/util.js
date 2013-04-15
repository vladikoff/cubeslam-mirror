var str = require('./types').toString
  , join = [].join;

// converts an ArrayBuffer to a string
exports.ab2s = function(buf){
  return join.call(new Uint8Array(buf));
}


// used as JSON replacer to
// find undefined values and
// remove excluded keys
exports.unhide = function(k,v){
  if( ~require('../world').EXCLUDED.indexOf(k) )
    return undefined;
  if( typeof v == 'undefined' )
    return 'undefined'
  return v;
}


// [frame,input...]
exports.qstr = function(queue){
  var s = [];
  for(var i=0; i<queue.length; i+=2){
    var frame = queue[i]
      , input = queue[i+1];
    s.push(frame + ': ' + str(input));
  }
  return 'Queue ('+queue.length+')\n\t'+s.join('\n\t');
}

