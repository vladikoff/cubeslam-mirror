module.exports = Bird;

var RAD2DEG = 180 / Math.PI;

function Bird(geometry, material){
  this.target = new THREE.Vector3(0,0,0);
  
  this.initiated = false;

  this.pathProgress = 0;
  this.dummie = new THREE.Vector3(0,0,0);
  this.dummie.y2 = 0;
  this.dummie.y = 0;
  this.dummie.speed = 1;
  this.dummie.rotation = 0;

  this.init(geometry, material);
} 

Bird.prototype.init = function( geometry, material ) {
    
    var morphMesh = new THREE.MorphAnimMesh(geometry,material)
    morphMesh.scale.set( 4, 4, 4 );
    /*0-19 : walk loop
    20-66 : look up
    67-145 : look down*/
    morphMesh.setAnimationLabel("fly",0,24);
    
    
    this.mesh = morphMesh;

     this.path = [{x:31, z:66}, {x:83, z:65}, {x:110, z:35}, {x:170, z:100}, {x:60, z:140} ,{x:100, z:160},{x:-50, z:-70},{x:0, z:66},{x:31, z:66}]

    for (var i = this.path.length - 1; i >= 0; i--) {
      this.path[i].x *= 3.7
      this.path[i].z *= 3.7

      this.path[i].x -= 400
      this.path[i].z -= 300
    };

    this.dummie.x = this.mesh.position.x = this.path[0].x
    
    this.mesh.position.y = 100
    this.dummie.z = this.mesh.position.z = this.path[0].z
    

    this.tween = TweenMax.to(this.dummie, 10, {bezier:{values:this.path,autoRotate:["x","z","rotation",-Math.PI*2,true]}, ease: Linear.easeNone});
    var dummie = this.dummie;
    TweenMax.to( this.dummie,2,{ y:180, speed: 3.2, overwrite:"none",onStart:function(){}, ease:Sine.easeInOut, repeat:-1,yoyo:true })
    TweenMax.to( this.dummie,0.25,{ y2:15,overwrite:"none", ease:Cubic.easeInOut, repeat:-1,yoyo:true })
   

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

  this.mesh.position.set(this.dummie.x,this.dummie.y+this.dummie.y2+100,this.dummie.z);
  this.mesh.rotation.y += ((b + dif)-this.mesh.rotation.y)/4;
  
  this.mesh.rotation.x += (((this.dummie.y/180 * 30-5)/180*Math.PI )-this.mesh.rotation.x)/5; 
 // this.mesh.rotation.z += (((this.dummie.y/40 * 30-15)/180*Math.PI )-this.mesh.rotation.z)/1
 
}
