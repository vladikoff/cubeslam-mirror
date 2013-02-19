
module.exports = function hashCode(object) {
  var hashs = [];

  for (var key in object) {
    if (typeof(object[key]) == "object") {
      object[key] = hashCode(object[key]);
    }
    // Add hash
    hashs.push(key + object[key] + key.length + (object[key]||'').length);
  }

  // Sort hash by keys
  hashs.sort();

  return djb2(hashs.join('|'));
}

function djb2(str) {
  var hash = 5381;
  for (var i = 0; i < str.length; i++) {
    char = str.charCodeAt(i);
    hash = ((hash << 5) + hash) + char; /* hash * 33 + c */
  }
  return hash;
}
