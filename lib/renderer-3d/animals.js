var settings = require('../settings')
  , Geometry = require('../geometry')
  , debug = require('debug')('renderer:3d:animals')

module.exports = Animals;

// Effects
//   #reset
//   #update(world)

function Animals(renderer, env ){
  debug('new')
  this.env = env;
  
  this.bear = createBear(renderer,env.terrain);

  this.lastTime = 0;
}

Animals.prototype = {

  reset: function(){
    debug('reset')

  },

  triggerEvent: function( id, paramObj ) {
    if( id == "bear_win") {
      this.bear.mesh.playAnimation("hurray",24);
      this.bear.state = "hurray"
      this.bear.mesh.updateAnimation(0);
    }
  },

  update: function(world,alpha){
     
    var delta = Date.now()-this.lastTime;
    this.lastTime = Date.now(); 

    if( this.env.pucks[0] ) {
      this.bear.target.z = this.env.pucks[0].position.z;
    }

    this.bear.update(world,delta);
  }


}

function createBear( renderer, terrain ) {
    
    var bear = new Bear();

    var geometry = Geometry.animal_bear;
    var morphMesh = new THREE.MorphAnimMesh(geometry,renderer.materials.animal)
    morphMesh.scale.set( 2.5, 2.5, 2.5 );
    morphMesh.setAnimationLabel("look",10,30);
    morphMesh.setAnimationLabel("hurray",40,100);

    morphMesh.position.set(-settings.data.arenaWidth*.5-100,-50,0)
    morphMesh.rotation.y = Math.PI*0.5;

    var shadowPlaneGeo = new THREE.PlaneGeometry( 150,250,1,1);
    var shadowMesh = new THREE.Mesh( shadowPlaneGeo, renderer.materials.terrainShadow );
    
    shadowMesh.rotation.x = -Math.PI*0.5;
    shadowMesh.position.set(morphMesh.position.x,-45,0)
    terrain.add(shadowMesh);

    terrain.add( morphMesh );

    bear.mesh = morphMesh;

    return bear;

}

function Bear(){
  this.target = new THREE.Vector3(0,0,0);
  this.progress = 0.5;
  this.lastProgress = 0;

  this.state = "look";
  this.lookInterpolation = 1 / 20;

  this.lastKeyframe = 0
}

Bear.prototype.update = function( world,delta ){


  if( this.state != "look" && this.mesh.currentKeyframe >= this.mesh.geometry.animations[ "hurray" ].end) {
    this.state = "look"
    this.progress = 0.5;
  }
  else if(this.state == "look"){
    var lookAtNorm = (this.target.z*1.4-settings.data.arenaHeight*.5)/-settings.data.arenaHeight
    lookAtNorm = Math.min(Math.max(lookAtNorm,0),1);
    if( !world.host ) lookAtNorm = 1-lookAtNorm;
    this.progress += (lookAtNorm-this.progress)/3;

    var anim = this.mesh.geometry.animations[ "look" ];

    var keyframe = Math.floor(this.progress * (anim.end-anim.start)) + anim.start;
    if ( keyframe != this.mesh.currentKeyframe ) {

      this.mesh.morphTargetInfluences[ this.lastKeyframe ] = 0;
      this.mesh.morphTargetInfluences[ this.mesh.currentKeyframe ] = 1;
      this.mesh.morphTargetInfluences[ keyframe ] = 0;

      this.lastKeyframe = this.mesh.currentKeyframe;
      this.mesh.currentKeyframe = keyframe;

    }

    var useProgress = this.progress;
    if(useProgress<this.lastProgress) {
      useProgress = (1-useProgress)
    }

    this.mesh.morphTargetInfluences[ keyframe ] = ( useProgress % this.lookInterpolation ) / this.lookInterpolation;
    this.mesh.morphTargetInfluences[ this.lastKeyframe ] = 1 - this.mesh.morphTargetInfluences[ keyframe ];
    
    this.lastProgress = this.progress;
  } 

  if( this.state == "hurray") {
    this.mesh.updateAnimation(delta) ;
  }
}

