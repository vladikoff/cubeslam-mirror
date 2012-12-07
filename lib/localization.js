var arb = require('./arb.js')
  , Emitter = require('emitter');

// Override standard arb register, to emit events.
var register = arb.register;
arb.register = function(n) {
  register.apply(this, arguments);

  if (typeof n == 'string') {
    localization.emit('new', n);
  } else {
    for (var i = 0; i < n.length; i++) {
      localization.emit('new', n);
    }
  }
};

var localization = {
  languages: [],
  init: function() {

    $.ajax({
      'url': '/localization/localization.arb',
      'dataType': 'text',
      'success': function(arbData) {
        eval(arbData);
      }
    });

    this.on('new', function() {
      // Language added.
      console.dir(arguments);
    }.bind(this));

  }
}

Emitter(localization);

module.exports = localization;
