
merge(exports,require('./bullet'))
merge(exports,require('./paddle'))
merge(exports,require('./puck'))
merge(exports,require('./game'))
merge(exports,require('./extra'))
merge(exports,require('./obstacle'))
merge(exports,require('./score'))
merge(exports,require('./debug'))
merge(exports,require('./player'))

function merge(into,obj){
  for(var k in obj)
    into[k] = obj[k];
}