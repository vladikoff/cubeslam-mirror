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

      $('*').filter(function() { return $(this).attr('arb:id'); }).each(function() {
          result[$(this).attr('arb:id')] = $(this).html();
      });

    }

    process.stdout.write('arb.register("arb_ref_app", ');
    process.stdout.write(JSON.stringify(result) + "\n");
    process.stdout.write("});\n");

  }
});
