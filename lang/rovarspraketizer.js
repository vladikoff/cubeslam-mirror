var fs = require("fs");

var rovarspraketizer = function(obj) {
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (key == '@@locale') {
        obj[key] = 'rv';
      } else {
        if (typeof(obj[key]) == 'object' && obj[key].substr(0,1) != '@') {
          obj[key] = rovarspraketizer(obj[key]);
        } else if (typeof(obj[key]) == 'string' && obj[key].substr(0, 1) != '@') {
          obj[key] = obj[key].replace(/([bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ])/g, "$1o$1");
        }
      }
    }
  }
  return obj;
}

var arb = {
  register: function(namespace, obj) {

    if (namespace.indexOf(':') != -1) {
      namespace = namespace.substr(0, namespace.indexOf(':') + 1) + 'rv';
    } else {
      namespace = 'rv';
    }

    process.stdout.write('arb.register("' + namespace + '", ');
    process.stdout.write(JSON.stringify(rovarspraketizer(obj),null,2));
    process.stdout.write(');');

  }
};

var original = fs.readFileSync('/dev/stdin', 'utf8');
eval(original);

