var $ = require('jquery')

exports.show = function(callback) {
  // The Camera Request Attention Arrow:
  document.getElementById('game').className = 'sim active';
  $('#cameraRequestAttention').show();
  // The up- and down- loop will stop when the arrow gets invisible.
  (function() {
    var up = function($element, callback) {
      $element.animate({ 'margin-top': '30px' }, 1000, 'swing', function() {
        if ($element.is(':visible')) {
          down($element);
        }
        callback && callback();
      });
    };
    var down = function($element, callback) {
      $element.animate({ 'margin-top': '55px' }, 1000, 'swing', function() {
        if ($element.is(':visible')) {
          up($element);
        }
        callback && callback();
      });
    };
    down($('#cameraRequestAttention img'), callback);
  }());
}

exports.hide = function() {
  $('#cameraRequestAttention img', this).stop(true, false).css('margin-top', '-170px');
  $('#cameraRequestAttention').hide();
}