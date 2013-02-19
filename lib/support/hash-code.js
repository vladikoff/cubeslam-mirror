
module.exports = function hashCode(object) {
  var hashs = [];

  if( typeof object !== 'object' ){
    hashs.push(object);

  } else {
    for (var key in object) {
      // recurse through objects (and arrays)
      if (typeof(object[key]) == "object") {
        object[key] = hashCode(object[key]);
      }

      // round off number to avoid float rounding errors
      if (typeof(object[key]) == "number") {
        object[key] = eps(object[key]);
      }

      // add to hash
      hashs.push(key + object[key] + key.length + String(object[key]).length);
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


var EPS = 1e-6;
function eps(x){ return Math.round(x/EPS) * EPS }