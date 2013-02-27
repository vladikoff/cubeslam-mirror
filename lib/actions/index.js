var Emitter = require('emitter');

Emitter(exports)

merge(exports,require('./bodies'))
merge(exports,require('./bullet'))
merge(exports,require('./paddle'))
merge(exports,require('./puck'))
merge(exports,require('./game'))
merge(exports,require('./extra'))
merge(exports,require('./obstacle'))
merge(exports,require('./force'))
merge(exports,require('./debug'))
merge(exports,require('./player'))
merge(exports,require('./shields'))

function merge(into,obj){
  for(var k in obj)
    into[k] = obj[k];
}