
var header = 'en-US,en;q=0.8,fil;q=0.6,en-GB;q=0.4,es-419;q=0.2,es;q=0.2,zh-TW;q=0.2,zh;q=0.2'

console.log(parseParams(header));

function parseParams(str){
  return str
    .split(/ *, */)
    .map(acceptParams)
    .filter(function(obj){
      return obj.quality;
    })
    .sort(function(a, b){
      if (a.quality === b.quality) {
        return a.originalIndex - b.originalIndex;
      } else {
        return b.quality - a.quality;
      }
    });
}

function acceptParams(str, index) {
  var parts = str.split(/ *; */);
  var ret = { value: parts[0], quality: 1, params: {}, originalIndex: index };

  for (var i = 1; i < parts.length; ++i) {
    var pms = parts[i].split(/ *= */);
    if ('q' == pms[0]) {
      ret.quality = parseFloat(pms[1]);
    } else {
      ret.params[pms[0]] = pms[1];
    }
  }

  return ret;
}