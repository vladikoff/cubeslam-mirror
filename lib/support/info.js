var debug = require('debug')('debug-info');

/*
<ol id="debug-info">
  <li class='data-channel'><span class='label'>{label}</span> {id1} -> {id2}</li>
  <li class='state-history {source}'>{state}</li>
  <li class='host-status'>{status}</li>
</ol>
*/
function ts(){
  var now = new Date()
  return '<time datetime="'+now.toISOString()+'">'+now.toUTCString()+'</time> ';
}

exports.dataChannel = function(dataChannel){
  debug('data channel',dataChannel.label,dataChannel._localId+' -> '+dataChannel._remoteId)
  $("#debug-info").append('<li class="data-channel" title="data channel created">'+ts()+'<span class="label">'+dataChannel.label+'</span>'+dataChannel._localId+' -> '+dataChannel._remoteId + '</li>');
}

exports.stateHistory = function(source,state){
  debug('state history',source,state)
  $("#debug-info").append('<li class="state-history '+source+'" title="state: '+source+'">'+ts()+state+'</li>');
}

exports.hostStatus = function(bool){
  debug('host status',bool ? 'Host' : 'Guest')
  $("#debug-info").append('<li class="host-status '+(bool ? 'host' : 'guest')+'" title="host changed">'+ts()+ (bool ? 'Host' : 'Guest') + '</li>');
}

$("#debug-info").on('click',function(){
  $(this).selectText();
})

jQuery.fn.selectText = function(){
    var doc = document
        , element = this[0]
        , range, selection
    ;
    if (doc.body.createTextRange) {
        range = document.body.createTextRange();
        range.moveToElementText(element);
        range.select();
    } else if (window.getSelection) {
        selection = window.getSelection();
        range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
    }
};
