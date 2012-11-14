var CameraAttention = {

  show: function() {
    // The Camera Request Attention Arrow:
    document.getElementById('game').className = 'sim active';
    $('#cameraRequestAttention').show();
    // The up- and down- loop will stop when the arrow gets invisible.
    (function() {
      var up = function($element) {
        $element.animate({ 'margin-top': '30px' }, 1000, function() {
          console.log('up finished');
          if ($element.is(':visible')) {
            down($element);
          }
        });
      };
      var down = function($element) {
        $element.animate({ 'margin-top': '100px' }, 1000, function() {
          console.log('down finished');
          if ($element.is(':visible')) {
            up($element);
          }
        });
      };
      down($('#cameraRequestAttention img'));
    }());
  },

  hide: function() {
    $('#cameraRequestAttention').fadeOut();
  }

};

module.exports = CameraAttention;

