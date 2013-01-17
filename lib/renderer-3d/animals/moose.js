module.exports = Moose;

var RAD2DEG = 180 / Math.PI;

function Moose(geometry, material){
  this.target = new THREE.Vector3(0,0,0);
  
  this.state = "walk";
  this.initiated = false;

  this.pathProgress = 0;
  this.dummie = new THREE.Vector3();
  this.dummie.rotation = Math.PI*0.5;



  this.init(geometry, material);
}

Moose.prototype.init = function( geometry, material ) {
    
    var morphMesh = new THREE.MorphAnimMesh(geometry,material)
    morphMesh.scale.set( 4, 4, 4 );
    /*0-19 : walk loop
    20-66 : look up
    67-145 : look down*/
    morphMesh.setAnimationLabel("walk",0,19);
    morphMesh.setAnimationLabel("lookUp",20,66);
    morphMesh.setAnimationLabel("lookDown",67,145);

    
    morphMesh.rotation.y = Math.PI*0.5;

    this.mesh = morphMesh;

    var tl = new TimelineLite({paused:true});

    this.path = [{x:311, z:665}, {x:832, z:653}, {x:1102, z:350}, {x:1700, z:1000}, {x:1600, z:1400} ,{x:1000, z:1600},{x:500, z:1400},{x:311, z:665}]

    for (var i = this.path.length - 1; i >= 0; i--) {
      this.path[i].x *= 0.6
      this.path[i].z *= 0.6

      this.path[i].x -= 600
      this.path[i].z -= 600
    };

    morphMesh.position.x = this.dummie.x = this.path[0].x;
    morphMesh.position.z = this.dummie.z = this.path[0].z;

    tl.append( TweenMax.to(this.dummie, 1, {bezier:{values:this.path, autoRotate:["x","z","rotation",-Math.PI*2,true]}, ease: Linear.easeNone}) );
   
    var beziers = BezierPlugin.bezierThrough(this.path,1,true);
    var line = new THREE.Line(new THREE.Geometry(), new THREE.LineBasicMaterial( { color: 0xffffff, opacity: 1, linewidth: 1 } ) );
    this.pathSpline = line;
    
    for (var i = beziers.x.length - 1; i >= 0; i--) {
      line.geometry.vertices.push( new THREE.Vector3(beziers.x[i].a,0,beziers.z[i].c))
    };

    this.dummyTimeline = tl;
    this.dummyTimeline.progress(this.pathProgress);

    this.initiated = true;
    this.next();

}

Moose.prototype.update = function( delta ){

  if( !this.initiated ) return;

  if( this.state == "walk" ) {

    this.mesh.updateAnimation(delta) ;

    if( this.mesh.currentKeyframe >= 19 ) {
      this.state = "waiting";
      this.next()
    }
  }
  else if(this.state == "lookUp"){
    
    this.mesh.updateAnimation(delta) ;

    if( this.mesh.currentKeyframe >= 66 ) {
      this.state = "waiting";
      this.next()
    }
  } 
  else if(this.state == "lookDown"){
    
    this.mesh.updateAnimation(delta) ;

    if( this.mesh.currentKeyframe >= 144 ) {
      this.state = "waiting";
      this.next()
    }
  } 
}

Moose.prototype.next = function(){
  
  var nextState;

  var rnd = Math.random()
  if( rnd > 0.9 ){
    nextState = "lookUp"
  }
  else if( rnd > 0.8 ){
    nextState = "lookDown"
  }
  else {
    nextState = "walk" 
  }
  
  var scope = this;
  if( nextState == "walk") {

    this.pathProgress += 0.018;
    if(this.pathProgress>=1.1) this.pathProgress = 0.1;

    this.dummyTimeline.progress(this.pathProgress);

    scope.mesh.playAnimation(nextState,24);
    scope.state = nextState;
    TweenMax.to(this.mesh.position,1,{x:this.dummie.x,z:this.dummie.z, onStart:function(){ 
    }, ease: Linear.easeNone})

    var toRotation = (this.dummie.rotation+Math.PI*1.5) * -1;
    
    var r = toRotation,
        b = scope.mesh.rotation.y,
      dif = (r - b) % (Math.PI * 2);

        if (dif !== dif % Math.PI) {
          dif += Math.PI * ((dif < 0) ? 2 : -2);
        }
    var targetRotation = (b + dif);


    TweenMax.to(scope.mesh.rotation,1,{y:targetRotation,ease: Linear.easeNone})

  }
  else {
    this.state = nextState;
    scope.mesh.playAnimation(nextState,24); 
  }
 
}