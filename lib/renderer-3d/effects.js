var settings = require('../settings')
  , Geometry = require('../geometry')
  , debug = require('debug')('renderer:3d:effects')
  , ObjectPool = require('./object-pool')
  , Materials = require('./materials');

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
  this.fog = createFog(renderer, env );

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
    /*var trailLength = this.puckTrails.length;
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
    };*/

    var showFog = false;
    for (var i = world.activeExtras.length - 1; i >= 0; i--) {
      var extra = world.activeExtras[i];
      
      if( extra.id == "fog" ) showFog = true;

    };

    
    var amount = Materials.fog.uniforms.amount.value;
    if( showFog ) {
      if( amount < 0 ) {
        this.arena.add( this.fog );
        amount= 0;
      }
      else if( amount < 1) {
        amount += 0.02;
      }
    }
    else {
      //remove fog
      if( amount > 0 ) {
        amount -= 0.02;
      }
      else {
        this.arena.remove( this.fog );
        amount = -1;
      } 
    } 

    Materials.fog.uniforms.amount.value = amount;
  }

}

function createFog( renderer, env) {
  
/*  var fogGeo  = new THREE.CubeGeometry( settings.data.arenaWidth, settings.data.arenaSideHeight, settings.data.arenaHeight*.5)
  var fogMesh = new THREE.Mesh(fogGeo, Materials.fog );
  fogMesh.position.z = -settings.data.arenaHeight*.25;
  fogMesh.position.y = settings.data.arenaSideHeight*.5;
*/
  var allSlices = new THREE.Geometry();
  var sliceGeo = new THREE.PlaneGeometry(settings.data.arenaWidth, settings.data.arenaSideHeight, 8,1);
  var totalSlices = 70; 
  var sliceDist = settings.data.arenaHeight*.5/totalSlices;
  var tempMesh = new THREE.Mesh(sliceGeo,null);
  for (var i = totalSlices-2; i >= 0; i--) {
    tempMesh.position.y = settings.data.arenaSideHeight*.5;
    tempMesh.position.z = -i*sliceDist-sliceDist;
    THREE.GeometryUtils.merge(allSlices,tempMesh);
  };

  var sliceMesh = new THREE.Mesh(allSlices, Materials.fog );

  return sliceMesh;
}

function createPuckTrailPool() {
  var puckTrailPool = new ObjectPool();

  puckTrailPool.createObject = function(){

    var r = settings.data.puckRadius;
    var puckGeo = new THREE.CubeGeometry( r*2,r*2,r*2 )
      , puckMat = new THREE.MeshLambertMaterial( { transparent:true, depthWrite:false,color: settings.theme.puckColor})
      , puckMesh = new THREE.Mesh( puckGeo, puckMat );
    puckMesh.name = 'puck'

    return puckMesh;

  }.bind(this)

  return puckTrailPool;

}
