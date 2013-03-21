
module.exports = Pool;


/**
 * A very simple object pooling function.
 *
 * It will auto-expand if needed.
 *
 * Example:
 *
 *    var pool = require('pool');
 *
 *    function Obj(){}
 *    pool(Obj);
 *
 *    var o = Obj.alloc();
 *    // use `o`
 *    Obj.free(o);
 */

function Pool(C,size){
  var totalPooled = size || 1;
  var freeList = [];
  function expand(howMany){
    console.warn('pool expand %s: %s',C.name,howMany)
    for(var i=0; i < howMany; i++ ){
      freeList[i] = new C;
    }
    totalPooled += howMany;
  }
  expand(totalPooled)
  C.alloc = function(){
    if( freeList.length < 1 ){
      expand(totalPooled) // *= 2
    }
    var instance = freeList.pop();
    instance.alloc && instance.alloc()
    return instance;
  }
  C.free = function(instance){
    instance.free && instance.free()
    freeList.push(instance)
  }
}
