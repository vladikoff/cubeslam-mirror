var  ImprovedNoise = require('./improved-noise')
  , Materials = require('./materials')
  , Geometry = require('../geometry');

module.exports = CPU;

function CPU(renderer) {

  this.isInitiated = false;
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

  this.expressions = [
    {id:0,label:"sad", weight:0,frame:117},
    {id:1,label:"what", weight:0,frame:118},
    {id:2,label:"angry", weight:0,frame:119},
    {id:3,label:"sad2", weight:0,frame:120}
  ]

  this.expressionActive = false;

  this.targetPos = new THREE.Vector3( 0,0,0 );
  this.targetRot = new THREE.Vector3( 0,0,0 );

  this.isAnimating = false;
  this.currentAnimLabel = "idle";

  //backdrop
  this.backdropMesh = new THREE.Mesh( new THREE.PlaneGeometry(640*2.7,360*2.7,2,2), Materials.cpuBackdrop);
  this.backdropMesh.position.z = -650;
  this.backdropMesh.position.y = 0;
  this.backdropMesh.position.x = 150;
  this.scene.add(this.backdropMesh);

  /*var gui = new dat.GUI({ autoPlace: false });
  gui.width = 332;
  document.getElementById("settingsLevelsGUI").appendChild(gui.domElement);

  for (var i = this.expressions.length - 1; i >= 0; i--) {
    gui.add( this.expressions[i],"weight",0,1).name(this.expressions[i].label).listen();
  };

  var scope = this;

  var triggers = {
    sad2: function(){ scope.setExpression("sad2")},
    sad: function(){ scope.setExpression("sad")},
    what: function(){scope.setExpression("what")},
    angry: function(){scope.setExpression("angry")}
  }

  gui.add( triggers,"sad" ).name("Trigger sad 1")
  gui.add( triggers,"what" ).name("Trigger what!?")
  gui.add( triggers,"sad2" ).name("Trigger sad 2")
  gui.add( triggers,"angry" ).name("Trigger angry")
  */

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
  var light = new THREE.DirectionalLight( 0xffffff ,1.2);
  light.position.set( 0, 2, 1 ).normalize();
  this.scene.add( light );

  var light = new THREE.PointLight( 0xffffff ,2,400);
  light.position.set( 0, 300, 400 );
  this.scene.add( light );

}

CPU.prototype.initCharacter = function(){

  if( this.bear ) return;

  var bear = new THREE.Object3D();

  var data = this.settings

  var materials = Geometry.cpu_materials;

  for (var i = materials.length - 1; i >= 0; i--) {
    materials[i].morphTargets = true;
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

  this.isInitiated = true;

};


CPU.prototype.getRenderTarget = function(){
  return this.renderTarget;
};


CPU.prototype.updateFaceMorph = function( reset ){
  for( index in this.expressions) {
    var obj = this.expressions[index];
    this.bear.body.morphTargetInfluences[ obj.frame ] = reset ? 0 : obj.weight;

   if( reset ) {
    TweenMax.killTweensOf(obj);
   }
  }
}

CPU.prototype.setExpression = function( label ){

  this.expressionActive = true;

  var scope = this;

  for (var i = this.expressions.length - 1; i >= 0; i--) {
    var obj = this.expressions[i];
    if( obj.label == label ) {

      TweenMax.to(obj,0.3,{weight:1, onCompleteScope:obj, onComplete:function(){
        TweenMax.to(this,0.3,{delay:0.5,weight:0,onComplete:function(){
          scope.expressionActive = false;
        }.bind(obj)})
      }});
    }
    else {
      TweenMax.to(obj,0.3,{weight:0});
    }

  };
}


CPU.prototype.update = function(time,world){

  if( !this.isInitiated ) return;

  time *= this.settings.trembleSpeed;

  var delta = Date.now()-this.lastTime;
  this.lastTime = Date.now();

  if( !this.expressionActive && this.currentAnimLabel != "blink" && this.bear.body.currentKeyframe == this.bear.body.geometry.animations[this.currentAnimLabel].end) {
    this.isAnimating = false
    this.bear.body.playAnimation("idle",24);
    this.bear.body.updateAnimation(0);
  }

  if( this.currentAnimLabel == "idle" || this.expressionActive ) {
    this.updateFaceMorph();
  }

  this.bear.body.updateAnimation(delta);


  if( !this.isAnimating ) {

    var bounces = 0;
    for( obj in world.puckBounces ) {
      bounces += world.puckBounces[obj]
    }

    this.settings.concentrate = Math.min(bounces/20,1);


    this.bear.position.lerp( this.targetPos.set(
      (this.settings.lookX-0.5)*40,
      this.settings.initPos.y + ImprovedNoise.noise(0,time,0)*this.settings.tremble - this.settings.concentrate*50,
      this.settings.initPos.z + this.settings.concentrate*10),
      0.2
    )

    this.bear.rotation.lerp( this.targetRot.set(
      this.settings.initRot.x + this.settings.concentrate*5*Math.PI/180,
      ((this.settings.lookX-0.5)*15)*Math.PI/180,
      this.bear.rotation.z),
      0.2
    )

  }

};

CPU.prototype.render = function(){
  if( !this.isInitiated ) return;
  this.renderer.render( this.scene, this.camera,  this.renderTarget,true);
};

CPU.prototype.setPaddleX = function( value ) {
  this.paw.position.x = -80 + value*80;

  this.settings.lookX = value

}

CPU.prototype.blink = function(){

  //this.updateFaceMorph(true);

  setTimeout(doBlink.bind(this),Math.random()*2000)

  function doBlink() {

    if( this.currentAnimLabel == "idle") {

      this.currentAnimLabel = "blink"

      this.bear.body.morphTargetInfluences[116 ] = 1;

    }

    setTimeout(function(){
        if( this.currentAnimLabel == "blink" ) {
          this.bear.body.morphTargetInfluences[116] = 0;
          this.currentAnimLabel = "idle"
        }
      }.bind(this),100)

    this.blink();
  }
}

CPU.prototype.playSequence = function(label){
  this.bear.body.playAnimation(label,24);
  this.bear.body.updateAnimation(0);
  this.currentAnimLabel = label;
  this.updateFaceMorph(true)
  this.expressionActive = false;
  this.isAnimating = true;

}

CPU.prototype.triggerEvent = function( label ){

  if( this.isAnimating ) return;

  this.updateFaceMorph(true);

  var tween;

  switch( label ) {

    case "win":
      var choice = Math.ceil(Math.random()*7);
      if( choice == 1 ) {
        dmaf.tell("opponent_screen_animation_win_happy")
        this.playSequence("happy")

      } else if( choice == 2){
        dmaf.tell("opponent_screen_animation_win_jump")
        tween = TweenMax.to(this.bear.position,0.3,{y:"10", yoyo:true, repeat:5, ease:Sine.easeOut})

        tween.vars.onComplete = function() {
          this.isAnimating = false;
        }.bind(this);
      }


      break;
    case "loose":

      var choice = Math.ceil(Math.random()*7);

      if( choice == 1 ) {
        dmaf.tell("opponent_screen_animation_loose_sad")
        this.bear.body.playAnimation("sad",24);
        this.bear.body.updateAnimation(0);
        this.currentAnimLabel = 'sad'

      }
      else if( choice == 2){
        //walk out
        dmaf.tell("opponent_screen_animation_loose_walkaway")
        TweenMax.to(this.bear.rotation,.2,{y:Math.PI*-0.5, ease:Back.easeOut, onComplete:function(){

          TweenMax.to(this.bear.position,3.2/15,{y:"-80", yoyo:true, repeat:5, ease:Sine.easeInOut})

          TweenMax.to(this.bear.position,3.2,{overwrite:"none", x:-650, onComplete:function(){
            this.isAnimating = false;
            this.triggerEvent("backToIdle");

          }.bind(this)})
        }.bind(this)})

        TweenMax.to(this.paw.position,0.2,{y:"-80"});


      }
      else if( choice == 3 ){
        //fall
        dmaf.tell("opponent_screen_animation_loose_fall")
        TweenMax.to(this.bear.position,0.2,{y:"-100",z:50, ease:Sine.easeOut, onComplete:function(){
          TweenMax.to(this.bear.position,0.6,{y:"-200", ease:Sine.easeIn})
        }.bind(this)})

        tween = TweenMax.to(this.bear.rotation,0,{overwrite:"none",y:Math.PI*-0.5,x:Math.PI*-.6, ease:Sine.easeIn})

        tween.vars.onComplete = function() {
          this.isAnimating = false;
          this.triggerEvent("backToIdle");
        }.bind(this)

        TweenMax.to(this.paw.position,0.2,{y:"-80"});

      }
      else if( choice == 4 ) {
        this.setExpression("sad");
      }
       else if( choice == 5 ) {
        this.setExpression("sad2");
      }
       else if( choice == 6 ) {
        this.setExpression("angry");
      }
       else if( choice == 7 ) {
        this.setExpression("what");
      }

      break;
    case "backToIdle":

      dmaf.tell("opponent_screen_animation_backtoidle")

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

}

function getExpressionByLabel( expressions, labelMatch ) {
  for (var i = expressions.length - 1; i >= 0; i--) {
    if(expressions[i].label == labelMatch ) return expressions[i]
  };
}