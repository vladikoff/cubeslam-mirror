var hashCode = require('../lib/support/hash-code');

console.assert(hashCode({})===hashCode({}),"empty objects should give same code")
console.assert(hashCode({b:2,a:1})===hashCode({a:1,b:2}),"key order shouldn't matter")
console.assert(hashCode([1,2,3])!==hashCode([3,2,1]),"index order should matter")
console.assert(hashCode([{}])===hashCode([{}]),"simple nesting")
console.assert(hashCode([{b:2,a:1}])===hashCode([{a:1,b:2}]),"simple nesting key ordering")
console.assert(hashCode([{b:[2,1],a:[1,2]}])===hashCode([{a:[1,2],b:[2,1]}]),"simple nesting key and index ordering")
console.assert(hashCode([{b:[Obj(),1],a:[1,2]}])===hashCode([{a:[1,2],b:[Obj(),1]}]),"complex nesting key and index ordering")
console.assert(hashCode([{b:[Obj(),132.32 * 10],a:[1,2]}])===hashCode([{a:[1,2],b:[Obj(),1323.2]}]),"complex nesting key and index ordering float rounding")

function Obj(){this.a=1;this.b=2;}


require('../lib/world')