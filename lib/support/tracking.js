var Tracker = require('tracker')
  , $ = require('jquery');

var playing = true;
exports.latency = new Tracker('#tracker-latency','timeline',{min:0, max: 500});
exports.messages = new Tracker('#tracker-messages','stack');
exports.inputs = new Tracker('#tracker-inputs','stack');

function showMeta(meta,data,ts){
  console.log(meta,data,ts)
}

exports.latency.on('meta',showMeta)
exports.messages.on('meta',showMeta)
exports.inputs.on('meta',showMeta)

exports.update = function(){
  if( playing ){
    // exports.latency.update()
    exports.messages.update()
    exports.inputs.update()
  }
}
