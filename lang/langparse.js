var fs = require("fs")
  , jsdom = require("jsdom");

var files = process.argv.slice(2);

var result = {
  "@@locale": "en",
  "@@context": "WebRTC Game"
};
var pending = 2;

files.forEach(function(file){
  jsdom.env({
    html: fs.readFileSync(file, 'utf8'),
    scripts: [ 'jquery.js' ],
    done: function(err, window) {
      if (err) {
        console.log(err);
      } else {
        var $ = window.jQuery;
        $('*').filter(function() { return $(this).attr('arb:id'); }).each(function() {
          result[$(this).attr('arb:id')] = $(this).html();
        });
      }
      --pending || done()
    }
  });
})

function done(){
  process.stdout.write('arb.register("webrtcgame:en",');
  process.stdout.write(JSON.stringify(result,null,2));
  process.stdout.write(");\n");
}