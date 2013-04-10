var Materials = require('../materials'),
  settings = require('../../settings'),
  Geometry = require('../geometry');

module.exports = Rabbit;

var RAD2DEG = 180 / Math.PI;

function Rabbit(terrain, speed, path, yValues ){

  this.terrain = terrain;
  this.target = new THREE.Vector3(0,0,0);

  this.speed = speed || 0.04;
  this.state = "jump";
  this.overrideState = "";
  this.initiated = false;

  var morphMesh = new THREE.MorphAnimMesh(Geometry.animal_rabbit,Materials.animal)
  morphMesh.scale.set( 4, 4, 4 );
  morphMesh.setAnimationLabel("jump",0,19);
  morphMesh.setAnimationLabel("sniff",20,70);

  this.mesh = morphMesh;
  this.terrain.add( this.mesh);


  var shadowPlaneGeo = new THREE.PlaneGeometry( 15,15,1,1);
  this.shadowMesh = new THREE.Mesh( shadowPlaneGeo, Materials.terrainShadow );

  this.shadowMesh.position.y = 0;
  this.shadowMesh.rotation.x = -Math.PI*0.5;
  this.mesh.add(this.shadowMesh);


  //animation
  this.pathProgress = 0;
  this.dummie = new THREE.Vector3();
  this.dummie.rotation = 0;

  var tl = new TimelineLite({paused:true});

  this.path = path
  this.yValues = yValues

  morphMesh.position.x = this.dummie.x = this.path[0].x;
  morphMesh.position.z = this.dummie.z = this.path[0].z;
  morphMesh.position.y = 0;

  var ray = new THREE.Raycaster( new THREE.Vector3(morphMesh.position.x, 500, morphMesh.position.z), new THREE.Vector3(0, -1, 0));
  var intersects = ray.intersectObject(this.terrain.terrainShortcut);

  if ( intersects.length > 0 ) {
     morphMesh.position.y = intersects[0].point.y+10;
  }

  tl.append( TweenMax.to(this.dummie, 1, {bezier:{values:this.path, autoRotate:["x","z","rotation",-Math.PI*2,true]}, ease: Linear.easeNone}) );

  var beziers = BezierPlugin.bezierThrough(this.path,1,true);
  var line = new THREE.Line(new THREE.Geometry(), new THREE.LineBasicMaterial( { color: 0xffffff, opacity: 1, linewidth: 1 } ) );

  //this.pathSpline = line;

  /*for (var i = beziers.x.length - 1; i >= 0; i--) {
    line.geometry.vertices.push( new THREE.Vector3(beziers.x[i].a,100,beziers.z[i].a))
  };*/

  this.dummyTimeline = tl;
  this.dummyTimeline.progress(this.pathProgress);
  terrain.add( line);

  this.initiated = true;
  //wait before starting to jump
  /*this.overrideState = "sniff";
  setTimeout(function(){
    this.overrideState = "jump";
    this.next();
  }.bind(this),2000)*/
}

var recordHeights = []

Rabbit.prototype.update = function( delta ){

  if( !this.initiated ) return;

  if( this.state == "jump" ) {

    this.mesh.updateAnimation(delta) ;

    if( this.mesh.currentKeyframe >= 19 ) {
      this.state = "waiting";
      this.next()
    }
  }
  else if(this.state == "sniff"){

    this.mesh.updateAnimation(delta) ;

    if( this.mesh.currentKeyframe >= 69 ) {
      this.state = "waiting";
      this.next()
    }
  }
}

Rabbit.prototype.next = function(){

  var nextState = Math.random()>0.5? "jump":"sniff";

  if( this.overrideState.length > 0 ) nextState = this.overrideState;

  var scope = this;
  if( nextState == "jump") {

    this.pathProgress += this.speed;
    if(this.pathProgress>=1) {
      this.pathProgress = 0;
      //console.log(recordHeights);
    }

    this.dummyTimeline.progress(this.pathProgress);

    scope.mesh.playAnimation(nextState,24);
    scope.state = nextState;
    var calculatedY = ( this.yValues )? this.yValues[Math.round(this.yValues.length*this.pathProgress)]:0;
    TweenMax.to(this.mesh.position,0.7,{delay:0.1,y: calculatedY,x:this.dummie.x,z:this.dummie.z,
      onStart:function(){

        if( !this.yValues ) {
          var ray = new THREE.Raycaster( new THREE.Vector3(this.mesh.position.x, 400, this.mesh.position.z), new THREE.Vector3(0, -1, 0));
          var intersects = ray.intersectObject(this.terrain.terrainShortcut);

          //find intersection with terrain
          if ( intersects.length > 0 ) {
             this.mesh.position.y = intersects[0].point.y+10;
          }
          recordHeights.push(Math.round(this.mesh.position.y))
        }

      }.bind(this),
      onUpdate: function(){
       /* var ray = new THREE.Raycaster( new THREE.Vector3(this.mesh.position.x, 400, this.mesh.position.z), new THREE.Vector3(0, -1, 0));
        var intersects = ray.intersectObject(this.terrain.terrainShortcut);

        //find intersection with terrain
        if ( intersects.length > 0 ) {
           this.mesh.position.y = intersects[0].point.y+10;
          // this.mesh.rotation = intersects[0].face.normal;
        }*/

      }.bind(this),
      easing: Sine.EaseIn
    })

    var toRotation = (this.dummie.rotation+Math.PI*1.5) * -1;

    var r = toRotation,
        b = scope.mesh.rotation.y,
      dif = (r - b) % (Math.PI * 2);

        if (dif !== dif % Math.PI) {
          dif += Math.PI * ((dif < 0) ? 2 : -2);
        }
    var targetRotation = (b + dif);


    TweenMax.to(scope.mesh.rotation,0.5,{y:targetRotation})

  }
  else {
    this.state = nextState;
    scope.mesh.playAnimation(nextState,24);
  }

}