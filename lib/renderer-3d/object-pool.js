module.exports = ObjectPool;

function ObjectPool() {
    this.pool = new Array();
    this.avail = new Array();
}

ObjectPool.prototype.createObject = function() {
    return new Object();
}

ObjectPool.prototype.getObject = function() {
    // see if we have any objects in the avail array
    if (this.avail.length == 0) {
        var o = this.createObject();
        o.poolId = this.pool.length;
        this.pool.push(o);
        this.avail.push(o.poolId);
    }

    var poolId = this.avail.pop();
    return this.pool[poolId];
}


ObjectPool.prototype.returnObject = function(poolId) {
    this.avail.push(poolId);
}