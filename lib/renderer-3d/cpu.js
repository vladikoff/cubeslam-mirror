var  ImprovedNoise = require('./improved-noise')
  , Geometry = require('../geometry');

module.exports = CPU;

function CPU(renderer) {

  this.width = 512;
  this.height = 360;

  this.lastTime = Date.now();

  this.renderer = renderer;

  this.init3D();

  //export
  this.texture = this.renderTarget;

  this.settings = {
    initPos: new THREE.Vector3(0,-225,60),
    initRot: new THREE.Vector3(15*Math.PI/180,0,0),
    scale: 6,
    sad:0,
    happy:0,
    tremble:5.4,
    trembleSpeed:0.4,
    lookX:0.5,
    concentrate:0
  }

  this.targetPos = new THREE.Vector3( 0,0,0 );
  this.targetRot = new THREE.Vector3( 0,0,0 );

  this.isAnimating = false;
  this.currentAnimLabel = "idle";

  //this.bear.body.playAnimation("happy",24);

  //backdrop
  this.backdropMesh = new THREE.Mesh( new THREE.PlaneGeometry(640*2.7,360*2.7,2,2), new THREE.MeshBasicMaterial({map:THREE.ImageUtils.loadTexture("images/backdrop.jpg")}));
  this.backdropMesh.position.z = -650;
  this.backdropMesh.position.y = 0;
  this.backdropMesh.position.x = 150;
  this.scene.add(this.backdropMesh);

}


CPU.prototype.init3D = function(  ){

  this.scene = new THREE.Scene();

  var camera = new THREE.PerspectiveCamera( 50, this.width / this.height, 1, 10000 );
  camera.position.z = 310
  camera.position.y = 0

  //point camera on scene
  camera.lookAt(new THREE.Vector3(0,0,0))

  this.camera = camera;

  this.renderTarget = new THREE.WebGLRenderTarget( this.width, this.height,  { minFilter: THREE.LinearLinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, useStencilBuffer:false } );
  this.renderTarget.generateMipmaps = false;
  var light = new THREE.DirectionalLight( 0xffffff ,2);
  light.position.set( 0.1, 0, 1 ).normalize();
  this.scene.add( light );

}

CPU.prototype.initCharacter = function(){

  var bear = new THREE.Object3D();

  var data = this.settings

  var materials = Geometry.cpu_materials;

  var color = [
    new THREE.Color().setRGB( 220/255,207/255,200/255 ),
    new THREE.Color().setRGB( 81/255,72/255,66/255),
    new THREE.Color().setRGB( 13/255,11/255,10/255 )
  ]


  for (var i = materials.length - 1; i >= 0; i--) {
    materials[i].morphTargets = true;
    materials[i].color = color[i]
  }



  var body = new THREE.MorphAnimMesh( Geometry.cpu , new THREE.MeshFaceMaterial( materials ) );

  body.setAnimationLabel("idle",0,0);
  body.setAnimationLabel("happy",1,59);
  body.setAnimationLabel("sad",60,117);

  body.rotation.y  = Math.PI;

  bear.add( body );
  bear.body = body;

  THREE.GeometryUtils.flipUVs(Geometry.paw);

  var pawMaterial = materials[1].clone();
  pawMaterial.morphTargets = false;

  var pawMesh = new THREE.Mesh( Geometry.paw,  pawMaterial );
  pawMesh.position.z = 180;
  pawMesh.rotation.x = -15*Math.PI/180
  pawMesh.rotation.y = Math.PI
  pawMesh.position.y  = -135;
  pawMesh.position.x  = 0;


  pawMesh.scale.set(3,3,3)
  this.scene.add(pawMesh);
  this.paw = pawMesh;

  bear.rotation = data.initRot.clone();
  bear.scale.set(data.scale,data.scale,data.scale);
  this.scene.add(bear);
  this.bear = bear;

  bear.position = data.initPos.clone();
  this.triggerEvent("backToIdle")

  this.blink();

};


CPU.prototype.getRenderTarget = function(){
  return this.renderTarget;
};

CPU.prototype.update = function(time){

  time *= this.settings.trembleSpeed;

  var delta = Date.now()-this.lastTime;
  this.lastTime = Date.now();

  if( this.currentAnimLabel != "blink" && this.bear.body.currentKeyframe == this.bear.body.geometry.animations[this.currentAnimLabel].end) {
    this.isAnimating = false
    this.bear.body.playAnimation("idle",24);
    this.bear.body.updateAnimation(0);
  }

  this.bear.body.updateAnimation(delta);


  if( !this.isAnimating ) {

    this.bear.position.lerp( this.targetPos.set(
      (this.settings.lookX-0.5)*40,
      this.settings.initPos.y + ImprovedNoise.noise(0,time,0)*this.settings.tremble - this.settings.concentrate*50,
      this.settings.initPos.z + this.settings.concentrate*150),
      0.2
    )

    this.bear.rotation.lerp( this.targetRot.set(
      this.settings.initRot.x + this.settings.concentrate*5*Math.PI/180,
      ((this.settings.lookX-0.5)*30)*Math.PI/180,
      this.bear.rotation.z),
      0.2
    )

  }

};

CPU.prototype.render = function(){
  this.renderer.render( this.scene, this.camera,  this.renderTarget,true);
};

CPU.prototype.setPaddleX = function( value ) {
  this.paw.position.x = -80 + value*80;

  this.settings.lookX = value

}

CPU.prototype.blink = function(){

  setTimeout(doBlink.bind(this),Math.random()*2000)

  function doBlink() {
    if( this.currentAnimLabel == "idle") {

      this.currentAnimLabel = "blink"
      this.bear.body.morphTargetInfluences[116 ] = 1;
      this.blink();

      setTimeout(function(){
        if( this.currentAnimLabel == "blink" ) {
          this.bear.body.morphTargetInfluences[116 ] = 0;
          this.currentAnimLabel = "idle"
        }
      }.bind(this),100)
    }
  }
}

CPU.prototype.triggerEvent = function( label ){

  if( this.isAnimating ) return;

  var tween;

  switch( label ) {

    case "win":

      if( Math.random() > 0.5 ) {
        this.bear.body.playAnimation("happy",24);
        this.bear.body.updateAnimation(0);
        this.currentAnimLabel = 'happy'
      } else {

        tween = TweenMax.to(this.bear.position,0.3,{y:"10", yoyo:true, repeat:5, ease:Sine.easeOut})

        tween.vars.onComplete = function() {
          this.isAnimating = false;
        }.bind(this);
      }


      break;
    case "loose":

      var choice = Math.ceil(Math.random()*3);

      if( choice == 1 ) {

        //sad morph
        this.bear.body.playAnimation("sad",24);
        this.bear.body.updateAnimation(0);
        this.currentAnimLabel = 'sad'

      }
      else if( choice == 2){
        //walk out
        TweenMax.to(this.bear.rotation,.2,{y:Math.PI*-0.5, ease:Back.easeOut, onComplete:function(){

          TweenMax.to(this.bear.position,3.2/15,{y:"-50", yoyo:true, repeat:5, ease:Sine.easeInOut})

          TweenMax.to(this.bear.position,3.2,{overwrite:"none", x:-650, onComplete:function(){
            this.isAnimating = false;
            this.triggerEvent("backToIdle");

          }.bind(this)})
        }.bind(this)})

        TweenMax.to(this.paw.position,0.2,{y:"-80"});


      }
      else if( choice == 3 ){
        //fall
        TweenMax.to(this.bear.position,0.2,{y:"-50",z:50, ease:Sine.easeOut, onComplete:function(){
          TweenMax.to(this.bear.position,0.6,{y:"-200", ease:Sine.easeIn})
        }.bind(this)})

        tween = TweenMax.to(this.bear.rotation,1.8,{overwrite:"none",y:Math.PI*-0.5,x:Math.PI*-.6, ease:Sine.easeIn})

        tween.vars.onComplete = function() {
          this.isAnimating = false;
          this.triggerEvent("backToIdle");
        }.bind(this)

        TweenMax.to(this.paw.position,0.2,{y:"-80"});

      }

      break;
    case "backToIdle":

      TweenMax.to(this.paw.position,0.2,{y:"80"});

      //this.setMorphTarget(0, 0.5);
      this.bear.position = this.settings.initPos.clone()
      this.bear.position.y -= 300;

      this.bear.rotation = this.settings.initRot.clone();

      TweenMax.to(this.bear.position,1,{ y:this.settings.initPos.y, ease:Back.easeOut, onComplete:function(){
          this.isAnimating = false;
          this.currentAnimLabel = "idle"
      }.bind(this)})

      break;

  }

  this.isAnimating = true;
}