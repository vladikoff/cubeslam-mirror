var settings = require('../settings')
  , Geometry = require('../geometry')
  , debug = require('debug')('renderer:3d:effects')
  , ObjectPool = require('./object-pool');

module.exports = Effects;

// Effects
//   - puckTrails[]
//   #update(world)

function Effects(renderer, env ){
  debug('new')
  this.env = env;
  this.arena = env.arena;
  this.puckTrailPool = createPuckTrailPool();
  this.puckTrails = []
  
}

Effects.prototype = {

  reset: function(){
    debug('reset')

    for (var i = this.puckTrails.length - 1; i >= 0; i--) {
      trailMesh = this.puckTrails[i];
      this.arena.remove( trailMesh );
      this.puckTrailPool.returnObject(trailMesh.poolId);
      this.puckTrails.splice(i,1);
      
    };  
  },


  update: function(world,alpha){
   
    //create them
    var trailLength = this.puckTrails.length;
    if( trailLength == 0 || (this.puckTrails[trailLength-1].material.opacity < 0.26))
      for(var i=0; i <  this.env.pucks.length; i++){
        var puck = this.env.pucks[i]
          , mesh = this.puckTrailPool.getObject();
        mesh.position = puck.position.clone()
        mesh.position.y = settings.data.puckRadius;
        mesh.scale.set(1,1,1)
        mesh.material.opacity = 0.3;
        this.arena.add(mesh);
        this.puckTrails.push(mesh);
      }
    

    //update them
    for (var i = this.puckTrails.length - 1; i >= 0; i--) {
      var trailMesh = this.puckTrails[i];
      trailMesh.material.opacity -= 0.01;
     // if(trailMesh.scale.x > 0) trailMesh.scale.addScalar(-0.01);
      if( trailMesh.material.opacity < 0.001 ) {
        this.arena.remove( trailMesh );
        this.puckTrailPool.returnObject(trailMesh.poolId);
        this.puckTrails.splice(i,1);
      }
    };

  }

}

function createPuckTrailPool() {
  var puckTrailPool = new ObjectPool();
  
  puckTrailPool.createObject = function(){

    var r = settings.data.puckRadius;
    var puckGeo = new THREE.CubeGeometry( r*2,r*2,r*2 )
      , puckMat = new THREE.MeshLambertMaterial( { transparent:true, depthWrite:false,color: settings.level.puckColor})
      , puckMesh = new THREE.Mesh( puckGeo, puckMat );
    puckMesh.name = 'puck'
    
    return puckMesh;

  }.bind(this)

  return puckTrailPool;

}
