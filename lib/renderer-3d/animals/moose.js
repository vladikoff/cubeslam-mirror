var Materials = require('../materials'),
  settings = require('../../settings'),
  Geometry = require('../geometry');

module.exports = Moose;

var RAD2DEG = 180 / Math.PI;

function Moose(terrain){

  this.terrain = terrain;
  this.target = new THREE.Vector3(0,0,0);

  this.state = "walk";
  this.initiated = false;

  this.pathProgress = 0;
  this.dummie = new THREE.Vector3();
  this.dummie.rotation = Math.PI*0.5;


  var morphMesh = new THREE.MorphAnimMesh(Geometry.animal_moose,Materials.animal)
  morphMesh.scale.set( 4, 4, 4 );
  /*0-19 : walk loop
  20-66 : look up
  67-145 : look down*/
  morphMesh.setAnimationLabel("walk",0,19);
  morphMesh.setAnimationLabel("lookUp",20,66);
  morphMesh.setAnimationLabel("lookDown",67,145);


  morphMesh.rotation.y = Math.PI*0.5;

  this.mesh = morphMesh;
  this.terrain.add( morphMesh);

  //shadow
  var shadowPlaneGeo = new THREE.PlaneGeometry( 25,55,1,1);
  this.shadowMesh = new THREE.Mesh( shadowPlaneGeo, Materials.terrainShadow );

  this.shadowMesh.position.y = 0;
  this.shadowMesh.rotation.x = -Math.PI*0.5;
  this.mesh.add(this.shadowMesh);


  //animation
  var tl = new TimelineLite({paused:true});

  this.path = [{x:0, z:0}, {x:-250, z:100}, {x:-400, z:500}, {x:0, z:700}, {x:200, z:400} ,{x:500, z:0},{x:100, z:-400},{x:0, z:0}]
  this.yValues = [37, 36, 35, 29, 29, 36, 44, 55, 62, 70, 78, 86, 96, 100, 104, 105, 105, 104, 103, 101, 99, 94, 86, 80, 72, 63, 62, 65, 52, 58, 67, 68, 68, 68, 67, 67, 65, 63, 59, 55, 48, 43, 38, 33, 28, 23, 18, 12, 6, 4, 6, 9, 14, 21, 27, 33]
  for (var i = this.path.length - 1; i >= 0; i--) {

    this.path[i].x -= 2000
    this.path[i].z += 800
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

 // terrain.add( line);

  this.dummyTimeline = tl;
  this.dummyTimeline.progress(this.pathProgress);

  this.initiated = true;
  this.next();


}

Moose.prototype.init = function( geometry, material ) {



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
var recordHeights = []
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
    if(this.pathProgress>=1.1) {
      this.pathProgress = 0.1;
      //console.log(recordHeights)
    }

    this.dummyTimeline.progress(this.pathProgress);

    scope.mesh.playAnimation(nextState,24);
    scope.state = nextState;
    var calculatedY = this.yValues[Math.round(this.yValues.length*this.pathProgress)]
    TweenMax.to(this.mesh.position,1,{y:calculatedY,x:this.dummie.x,z:this.dummie.z,
      ease: Linear.easeNone/*,
      onStart: function(){
        var ray = new THREE.Raycaster( new THREE.Vector3(this.mesh.position.x, 200, this.mesh.position.z), new THREE.Vector3(0, -1, 0));
        var intersects = ray.intersectObject(this.terrain.terrainShortcut);

        //find intersection with terrain
        if ( intersects.length > 0 ) {
           this.mesh.position.y = intersects[0].point.y+10;
        }
        recordHeights.push(Math.round(this.mesh.position.y))



      }.bind(this)*/})

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