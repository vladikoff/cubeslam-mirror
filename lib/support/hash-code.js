
module.exports = function hashCode(object) {
  var hashs = [];
  if (typeof(object) == "number") {
    hashs.push(eps(object));

  } else if( typeof object !== 'object' ){
    hashs.push(object);

  } else {
    for (var key in object) {
      var val = object[key];

      // recurse through objects (and arrays)
      if (typeof(val) == "object") {
        val = hashCode(val);
      }

      // round off number to avoid float rounding errors
      if (typeof(val) == "number") {
        val = eps(val);
      }

      // add to hash
      hashs.push(key + val + key.length + toString(val).length);
    }
  }

  // sort by keys
  hashs.sort();

  return djb2(hashs.join('|'));
}

function djb2(str) {
  var hash = 5381;
  for (var i = 0; i < str.length; i++) {
    var ch = str.charCodeAt(i);
    hash = ((hash << 5) + hash) + ch; /* hash * 33 + c */
  }
  return hash;
}


var EPS = 1e-1;
function eps(x){ return Math.round(x/EPS) * EPS }

function toString(s){
  return Object.prototype.toString.call(null,s);
}