
var Materials = require('../materials'),
  settings = require('../../settings'),
  Geometry = require('../../geometry');

module.exports = Bird;

var RAD2DEG = 180 / Math.PI;

function Bird( container, speed, path){
  this.container = container;
  this.speed = speed;
  this.path = path;

  this.initiated = false;
  this.target = new THREE.Vector3(0,0,0);

  this.pathProgress = 0;
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

  this.dummie.x = this.mesh.position.x = this.path[0].x
  
  this.mesh.position.y = 0
  this.dummie.z = this.mesh.position.z = this.path[0].z
  

  this.tween = TweenMax.to(this.dummie, 10, {bezier:{values:this.path,autoRotate:["x","z","rotation",-Math.PI*2,true]}, ease: Linear.easeNone});
  var dummie = this.dummie;
  TweenMax.to( this.dummie,1,{ y:140, speed: 2.2, overwrite:"none",onStart:function(){}, ease:Sine.easeInOut, repeat:-1,yoyo:true })
  TweenMax.to( this.dummie,1.25,{ y2:15,overwrite:"none", ease:Cubic.easeInOut, repeat:-1,yoyo:true })
 

  var beziers = BezierPlugin.bezierThrough(this.path,1,true);
  var line = new THREE.Line(new THREE.Geometry(), new THREE.LineBasicMaterial( { color: 0xffffff, opacity: 1, linewidth: 3 } ) );
  this.pathSpline = line;
  
  for (var i = beziers.x.length - 1; i >= 0; i--) {
    line.geometry.vertices.push( new THREE.Vector3(beziers.x[i].a,0,beziers.z[i].c))
  };


  this.initiated = true;
  this.mesh.playAnimation("fly",24);

}

Bird.prototype.update = function( delta ){

  if( !this.initiated ) return;

  this.mesh.updateAnimation(delta*this.dummie.speed);

  this.pathProgress += 0.0025;
  if(this.pathProgress>=1) this.pathProgress = 0;


  this.tween.progress(this.pathProgress);

  var r = (this.dummie.rotation+Math.PI*1.5) * -1,
      b = this.mesh.rotation.y,
    dif = (r - b) % (Math.PI * 2);

    if (dif !== dif % Math.PI) {
      dif += Math.PI * ((dif < 0) ? 2 : -2);
    }

  this.mesh.position.set(this.dummie.x,this.dummie.y+this.dummie.y2,this.dummie.z);
  this.mesh.rotation.y += ((b + dif)-this.mesh.rotation.y)/4;
  
  //this.mesh.rotation.x += (((this.dummie.y/180 * 30-5)/180*Math.PI )-this.mesh.rotation.x)/5; 
 // this.mesh.rotation.z += (((this.dummie.y/40 * 30-15)/180*Math.PI )-this.mesh.rotation.z)/1
 
}
