var
  fs = require("fs"),
  jquery = require("jquery"),
  jsdom = require("jsdom");

jsdom.env({
  html: fs.readFileSync('/dev/stdin', 'utf8'),
  done: function(err, window) {

    var result = {};

    if (!err) {

      (function ($) {

        $('.copy').each(function() {
          if ($(this).hasAttribute('id')) {
            result[$(this).attr('id')] = $(this).html();
          }
        });

      }(jQuery));

    }

    process.stdout.write(JSON.stringify(result) + "\n");

  }
});
