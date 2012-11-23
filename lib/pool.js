
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
    for(var i=0; i < howMany; i++ )
      freeList[i] = new C;
  }
  expand(totalPooled)
  C.alloc = function(){
    if( freeList.length < 1 )
      expand(totalPooled*.2) // + 20%
    return freeList.pop();
  }
  C.free = function(instance){
    instance.destroy && instance.destroy()
    freeList.push(instance)
  }
}
