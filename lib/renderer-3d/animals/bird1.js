
var Materials = require('../materials'),
  settings = require('../../settings'),
  Geometry = require('../geometry');

module.exports = Bird;

var RAD2DEG = 180 / Math.PI;

function Bird( container,  path){
  this.container = container;
  this.speed = 2;
  this.path = path;

  this.initiated = false;
  this.target = new THREE.Vector3(0,0,0);

  this.pathProgress = 0.2;
  this.dummie = new THREE.Vector3(0,0,0);
  this.dummie.y2 = 0;
  this.dummie.y = 0;
  this.dummie.speed = 1;
  this.dummie.rotation = 0;

  var morphMesh = new THREE.MorphAnimMesh(Geometry.animal_bird1,Materials.animal)
  morphMesh.scale.set( 4, 4, 4 );
  morphMesh.setAnimationLabel("fly",0,24);

  this.mesh = morphMesh;

  this.container.add( this.mesh);

  this.dummie.set(this.path[0].x,this.path[0].y,this.path[0].z)

  this.mesh.position.y = 0

  this.dummie.rotationX = 0
  this.dummie.rotationZ = 0
  this.dummie.y2 = 0;
  this.dummie.x2 = 0;
  this.dummie.z2 = 0;

  this.tween = TweenMax.to(this.dummie, 10, {bezier:{values:this.path,autoRotate:[ ["z","x","rotationY",0,true]]}, ease: Linear.easeNone});
  var dummie = this.dummie;
  TweenMax.to( this.dummie,Math.random()+1,{ speed: Math.random()+1, overwrite:"none",onStart:function(){}, ease:Sine.easeInOut, repeat:-1,yoyo:true })
  TweenMax.to( this.dummie,0.75,{ y2:10, overwrite:"none", ease:Cubic.easeInOut, repeat:-1,yoyo:true })


  var beziers = BezierPlugin.bezierThrough(this.path,1,true);

  this.initiated = true;
  this.mesh.playAnimation("fly",24);

}

Bird.prototype.destroy = function(){
  TweenMax.killTweensOf(this.dummie)
  this.mesh.parent.remove(this.mesh)
  this.mesh.geometry.dispose();
}

Bird.prototype.update = function( delta ){

  if( !this.initiated ) return;

  this.mesh.updateAnimation(delta*this.dummie.speed);

  this.pathProgress += 0.001;
  if(this.pathProgress>=1) this.pathProgress = 0;


  this.tween.progress(this.pathProgress);

 /* var r = (this.dummie.rotation+Math.PI*1.5) * -1,
      b = this.mesh.rotation.y,
    dif = (r - b) % (Math.PI * 2);

    if (dif !== dif % Math.PI) {
      dif += Math.PI * ((dif < 0) ? 2 : -2);
    }*/

  this.mesh.position.set(this.dummie.x+this.dummie.x2,this.dummie.y+this.dummie.y2,this.dummie.z);
  //this.mesh.rotation.y += ((b + dif)-this.mesh.rotation.y)/4;

  //this.mesh.rotation.x += (((this.dummie.y/180 * 30-5)/180*Math.PI )-this.mesh.rotation.x)/5;
 //this.mesh.rotation.z += (((this.dummie.y/40 * 30-15)/180*Math.PI )-this.mesh.rotation.z)/1
  this.mesh.rotation.set(this.dummie.rotationX,this.dummie.rotationY,this.dummie.rotationZ);
}
