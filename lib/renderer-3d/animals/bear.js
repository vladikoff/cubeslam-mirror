var Materials = require('../materials'),
  settings = require('../../settings'),
  Geometry = require('../geometry');

module.exports = Bear;

function Bear(terrain){

  this.target = new THREE.Vector3(0,0,0);
  this.progress = 0.5;
  this.lastProgress = 0;

  this.state = "look";
  this.lookInterpolation = 1 / 20;

  this.lastKeyframe = 0;

  var geometry = Geometry.animal_bear;
  var morphMesh = new THREE.MorphAnimMesh(geometry,Materials.animal);
  morphMesh.scale.set( 3, 3, 3 );
  morphMesh.setAnimationLabel("look",10,30);
  morphMesh.setAnimationLabel("hurray",40,100);

  morphMesh.position.set(-settings.data.arenaWidth*0.5-100,5,600);
  morphMesh.rotation.y = Math.PI*0.5;

  var shadowPlaneGeo = new THREE.PlaneGeometry( 60,60,1,1);
  var shadowMesh = new THREE.Mesh( shadowPlaneGeo, Materials.terrainShadow );

  shadowMesh.rotation.x = -Math.PI*0.46;
  shadowMesh.position.set(0,1,0);
  this.shadowMesh = shadowMesh;
  morphMesh.add(shadowMesh);

  terrain.add( morphMesh );

  this.mesh = morphMesh;

}

Bear.prototype.win = function() {
  this.mesh.playAnimation("hurray",24);
  this.state = "hurray";
  this.mesh.updateAnimation(0);
};

Bear.prototype.update = function( world,delta ){

  if( this.state !== "look" && this.mesh.currentKeyframe >= this.mesh.geometry.animations['hurray'].end) {
    this.state = "look";
    this.mesh.morphTargetInfluences[ this.mesh.geometry.animations['hurray'].end - 1 ] = 0;
    this.progress = 0.5;
  }
  else if(this.state === "look"){

    var lookAtNorm = (this.target.z*1.4-settings.data.arenaHeight*0.5)/-settings.data.arenaHeight;
    lookAtNorm = Math.min(Math.max(lookAtNorm,0),1);
    //if( !world.host ) {
      //lookAtNorm = 1-lookAtNorm;
    //}
    this.progress += (lookAtNorm-this.progress)/3;

    var anim = this.mesh.geometry.animations['look'];

    var keyframe = Math.floor(this.progress * (anim.end-anim.start)) + anim.start;
    if ( keyframe !== this.mesh.currentKeyframe ) {

      this.mesh.morphTargetInfluences[ this.lastKeyframe ] = 0;
      this.mesh.morphTargetInfluences[ this.mesh.currentKeyframe ] = 1;
      this.mesh.morphTargetInfluences[ keyframe ] = 0;

      this.lastKeyframe = this.mesh.currentKeyframe;
      this.mesh.currentKeyframe = keyframe;

    }

    var useProgress = this.progress;
    if(useProgress<this.lastProgress) {
      useProgress = (1-useProgress);
    }

    this.mesh.morphTargetInfluences[ keyframe ] = ( useProgress % this.lookInterpolation ) / this.lookInterpolation;
    this.mesh.morphTargetInfluences[ this.lastKeyframe ] = 1 - this.mesh.morphTargetInfluences[ keyframe ];

    this.lastProgress = this.progress;
  }

  if( this.state === "hurray") {
    this.mesh.updateAnimation(delta);
  }
};