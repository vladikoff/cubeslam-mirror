var hashCode = require('../lib/support/hash-code');

console.assert(hashCode(123)===hashCode(123),"numbers should work")
console.assert(hashCode(NaN)===hashCode(NaN),"nan should work")
console.assert(hashCode(undefined)===hashCode(undefined),"undefined should work")
console.assert(hashCode(null)===hashCode(null),"null should work")
console.assert(hashCode(321)!==hashCode(123),"numbers should fail")
console.assert(hashCode(-123)===hashCode(-123),"negative numbers should work")
console.assert(hashCode(-123)!==hashCode(-321),"negative numbers should fail")
console.assert(hashCode('abc')===hashCode('abc'),"strings should work")
console.assert(hashCode('abc')!==hashCode('cba'),"strings should fail")
console.assert(hashCode({})===hashCode({}),"empty objects should give same code")
console.assert(hashCode([])===hashCode([]),"empty arrays should give same code")
console.assert(hashCode(new Obj())===hashCode(new Obj()),"empty instance should give same code")
console.assert(hashCode(Obj)===hashCode(Obj),"same functions should give same code")
console.assert(hashCode(noop)!==hashCode(Obj),"different functions should give same code")
console.assert(hashCode({b:2,a:1})===hashCode({a:1,b:2}),"key order shouldn't matter")
console.assert(hashCode([1,2,3])!==hashCode([3,2,1]),"index order should matter")
console.assert(hashCode([{}])===hashCode([{}]),"simple nesting")
console.assert(hashCode([{b:2,a:1}])===hashCode([{a:1,b:2}]),"simple nesting key ordering")
console.assert(hashCode([{b:[2,1],a:[1,2]}])===hashCode([{a:[1,2],b:[2,1]}]),"simple nesting key and index ordering")
console.assert(hashCode([{b:[new Obj(),1],a:[1,2]}])===hashCode([{a:[1,2],b:[new Obj(),1]}]),"complex nesting key and index ordering")
console.assert(hashCode([{b:[Obj(),132.32 * 10],a:[1,2]}])===hashCode([{a:[1,2],b:[Obj(),1323.2]}]),"complex nesting key and index ordering float rounding")

function noop(){}
function Obj(){this.a=1;this.b=2;}

// make sure hashCode doesn't modify the object
var obj = {one:1,two:{three:3}};
hashCode(obj)
console.assert(typeof obj.two == 'object',"should not modify the source object")

// JSON stringified copy of a World object:
var world0 = {"frame":0,"index":0,"name":"game","rand":{"state":14904},"bodies":{"values":[],"lookup":{},"reverse":{},"length":0},"pucks":{"values":[],"lookup":{},"reverse":{},"length":0},"extras":{"values":[],"lookup":{},"reverse":{},"length":0},"obstacles":{"values":[],"lookup":{},"reverse":{},"length":0},"forces":{"values":[],"lookup":{},"reverse":{},"length":0},"bullets":{"values":[],"lookup":{},"reverse":{},"length":0},"paddles":{"values":[],"lookup":{},"reverse":{},"length":0},"shields":{"values":[],"lookup":{},"reverse":{},"length":0},"lastHitPucks":{},"puckBounces":{},"alive":0,"maxAlive":0,"state":"init","multiplayer":false,"winner":null,"level":null,"me":null,"opponent":null,"collisions":0,"players":{"a":{"name":"HAL (A)","shields":[],"score":0,"paddle":-1},"b":{"name":"EVE (B)","shields":[],"score":0,"paddle":-1}}};
var world1 = {"frame":0,"index":0,"name":"game","rand":{"state":14904},"bodies":{"values":[],"lookup":{},"reverse":{},"length":0},"pucks":{"values":[],"lookup":{},"reverse":{},"length":0},"extras":{"values":[],"lookup":{},"reverse":{},"length":0},"obstacles":{"values":[],"lookup":{},"reverse":{},"length":0},"forces":{"values":[],"lookup":{},"reverse":{},"length":0},"bullets":{"values":[],"lookup":{},"reverse":{},"length":0},"paddles":{"values":[],"lookup":{},"reverse":{},"length":0},"shields":{"values":[],"lookup":{},"reverse":{},"length":0},"lastHitPucks":{},"puckBounces":{},"alive":0,"maxAlive":0,"state":"init","multiplayer":false,"winner":null,"level":null,"me":null,"opponent":null,"collisions":0,"players":{"a":{"name":"HAL (A)","shields":[],"score":0,"paddle":-1},"b":{"name":"EVE (B)","shields":[],"score":0,"paddle":-1}}};
console.assert(hashCode(world0)===hashCode(world1),"two world objects give the same hash")

// make sure none of the tested ones give the same hash
console.log(hashCode({}))
console.log(hashCode({a:1,b:2}))
console.log(hashCode([1,2,3]))
console.log(hashCode([3,2,1]))
console.log(hashCode([{}]))
console.log(hashCode([{b:2,a:1}]))
console.log(hashCode([{b:[2,1],a:[1,2]}]))
console.log(hashCode([{b:[Obj(),1],a:[1,2]}]))
console.log(hashCode([{b:[Obj(),132.32 * 10],a:[1,2]}]))
console.log(hashCode(world0))

// see how many bytes each hash takes (int/uint?)
console.log(byteSize(hashCode({})))
console.log(byteSize(hashCode({a:1,b:2})))
console.log(byteSize(hashCode([1,2,3])))
console.log(byteSize(hashCode([3,2,1])))
console.log(byteSize(hashCode([{}])))
console.log(byteSize(hashCode([{b:2,a:1}])))
console.log(byteSize(hashCode([{b:[2,1],a:[1,2]}])))
console.log(byteSize(hashCode([{b:[Obj(),1],a:[1,2]}])))
console.log(byteSize(hashCode([{b:[Obj(),132.32 * 10],a:[1,2]}])))
console.log(byteSize(hashCode(world0)))

function byteSize(n){
  if( range(n,-Math.pow(2,8)/2,Math.pow(2,8)/2) )
    return '  int8 - '+n;
  if( range(n,0,Math.pow(2,8)) )
    return ' uint8 - '+n;
  if( range(n,-Math.pow(2,16)/2,Math.pow(2,16)/2) )
    return ' int16 - '+n;
  if( range(n,0,Math.pow(2,16)) )
    return 'uint16 - '+n;
  if( range(n,-Math.pow(2,32)/2,Math.pow(2,32)/2) )
    return ' int32 - '+n;
  if( range(n,0,Math.pow(2,32)) )
    return 'uint32 - '+n;
  if( range(n,-Math.pow(2,64)/2,Math.pow(2,64)/2) )
    return ' int64 - '+n;
  if( range(n,0,Math.pow(2,64)) )
    return 'uint64 - '+n;
  return 'string'
}

function range(n,a,b){
  return n > a && n < b;
}