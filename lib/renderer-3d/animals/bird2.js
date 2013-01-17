module.exports = PickingBird;

function PickingBird(geometry, material){
  this.target = new THREE.Vector3(0,0,0);
  
  this.initiated = false;

  this.init(geometry, material);
}

PickingBird.prototype.init = function( geometry, material ) {
    
    var morphMesh = new THREE.MorphAnimMesh(geometry,material)
    morphMesh.scale.set( 4, 4, 4 );
    morphMesh.setAnimationLabel("pick",0,22);
    morphMesh.setAnimationLabel("lookUp",23,54);

    //morphMesh.position = new THREE.Vector3(0,0,0);
    morphMesh.rotation.y = -Math.PI*0.2;

    this.mesh = morphMesh;

    this.initiated = true;
    
    this.state = "pick";
    this.mesh.playAnimation("pick",24);


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