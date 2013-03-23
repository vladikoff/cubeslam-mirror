var Materials = require('../materials'),
  settings = require('../../settings'),
  Geometry = require('../geometry');

module.exports = PickingBird;

function PickingBird(terrain){
  this.terrain = terrain;
  this.target = new THREE.Vector3(0,0,0);

  this.initiated = false;

  var morphMesh = new THREE.MorphAnimMesh(Geometry.animal_bird4,Materials.animal)
  morphMesh.scale.set( 4, 4, 4 );
  morphMesh.setAnimationLabel("pick",0,22);
  morphMesh.setAnimationLabel("lookUp",23,54);

  //morphMesh.position = new THREE.Vector3(0,0,0);
  morphMesh.rotation.y = -Math.PI*0.2;

  this.mesh = morphMesh;

  this.initiated = true;

  this.state = "pick";
  this.mesh.playAnimation("pick",24);
  this.terrain.add( this.mesh);

  this.mesh.position.x = 1200;
  this.mesh.position.z = -1000;

  //attach to terrain
  var ray = new THREE.Raycaster( new THREE.Vector3(this.mesh.position.x, 200, this.mesh.position.z), new THREE.Vector3(0, -1, 0));
  var intersects = ray.intersectObject(this.terrain.terrainShortcut);

  //find intersection with terrain
  if ( intersects.length > 0 ) {
     this.mesh.position.y = intersects[0].point.y+10;
  }

  //shadow
  var shadowPlaneGeo = new THREE.PlaneGeometry( 15,15,1,1);
  this.shadowMesh = new THREE.Mesh( shadowPlaneGeo, Materials.terrainShadow );

  this.shadowMesh.position.y = 0;
  this.shadowMesh.rotation.x = -Math.PI*0.5;
  this.mesh.add(this.shadowMesh);

}

PickingBird.prototype.update = function( delta ){

  if( !this.initiated ) return;

  if( this.state == "pick" ) {

    this.mesh.updateAnimation(delta) ;

    if( this.mesh.currentKeyframe >= 21 ) {
      this.next()
    }
  }
  else if(this.state == "lookUp"){

    this.mesh.updateAnimation(delta) ;

    if( this.mesh.currentKeyframe >= 53 ) {
      this.next()
    }
  }

}

PickingBird.prototype.next = function(){

  if( Math.random() > 0.5 && this.state == "pick"){
     this.state = "lookUp";
     this.mesh.playAnimation("lookUp",24);
  }
  else {
    this.state = "pick"
    this.mesh.playAnimation("pick",24);
  }




}