var logger = require('log-worker')


var colors = [6, 2, 3, 4, 5, 1];
var prevColor = 0;

// id is session specific
var id = Date.now().toString(16).slice(6);
//console.log('session id',id)

// session color
var sc = colors[id.charCodeAt(id.length-1) % colors.length];

//console.log('session color',sc)

module.exports = function debug(name){
  var c = colors[prevColor++ % colors.length];
  return function(fmt){
    // fmt = id+' network-inputs '+fmt
    fmt = '  \u001b[9' + sc + 'm' + id
        + '  \u001b[9' + c + 'm' + name + ' '
        + '\u001b[3' + c + 'm\u001b[90m'
        + fmt + '\u001b[3' + c + 'm\u001b[0m';
    //logger.log.apply(console,arguments)
  }
}