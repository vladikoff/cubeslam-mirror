var
  fs = require("fs"),
  jsdom = require("jsdom");

jsdom.env({
  html: fs.readFileSync('/dev/stdin', 'utf8'),
  scripts: [ 'jquery.js' ],
  done: function(err, window) {

    var
      $,
      result = {};

    if (err) {

      console.log(err);

    } else {

      $ = window.jQuery;

      $('.copy').each(function() {
        if ($(this).attr('id')) {
          result[$(this).attr('id')] = $(this).html();
        }
      });

    }

    process.stdout.write(JSON.stringify(result) + "\n");

  }
});
