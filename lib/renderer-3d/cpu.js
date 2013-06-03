var ImprovedNoise = require('../improved-noise')
  , Materials = require('./materials')
  , settings = require('../settings')
  , Geometry = require('./geometry')
  , dmaf = require('../dmaf.min');

module.exports = CPU;

function CPU(renderer) {

  this.isInitiated = false;

  if( settings.data.quality === settings.QUALITY_MOBILE ) {
    this.width = 512*0.5;
    this.height = 360*0.5;
  }
  else {
    this.width = 512;
    this.height = 360;
  }



  this.lastTime = Date.now();
  this.lastX = 0;
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
    {id:0,label:"blink1", weight:0,frame:105},
    {id:1,label:"blink2", weight:0,frame:106},
    {id:2,label:"angryEye", weight:0,frame:107},
    {id:3,label:"anxious", weight:0,frame:108},
    {id:4,label:"idle2", weight:0,frame:109},
    {id:4,label:"jawdrop", weight:0,frame:110}

  ]
  this.blinkFrame = 104

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
/*
  var gui = new dat.GUI({ autoPlace: false });
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
  body.setAnimationLabel("sad",60,104);

  body.rotation.y  = Math.PI;

  bear.add( body );
  bear.body = body;

  THREE.GeometryUtils.flipUVs(Geometry.paw);

  var pawMaterial = materials[0].clone();
  pawMaterial.morphTargets = false;

  var pawMesh = new THREE.Mesh( Geometry.paw,  pawMaterial );
  pawMesh.position.z = 180;
  pawMesh.rotation.x = -20*Math.PI/180
  pawMesh.rotation.y = Math.PI
  pawMesh.position.y  = -135;
  pawMesh.position.x  = -40;
  pawMesh.scale.set(3,3,3)
  this.scene.add(pawMesh);
  this.paw = pawMesh;

  pawMesh = new THREE.Mesh( Geometry.paw,  pawMaterial );
  pawMesh.position.z = 180;
 
  pawMesh.rotation.x = -20*Math.PI/180
  pawMesh.rotation.y = Math.PI
  pawMesh.position.y  = -135;
  pawMesh.position.x  = 40;
  pawMesh.scale.set(3,3,3)
  this.scene.add(pawMesh);
  this.paw2 = pawMesh;

  bear.rotation = data.initRot.clone();
  bear.scale.set(data.scale,data.scale,data.scale);
  this.scene.add(bear);
  this.bear = bear;

  bear.position = data.initPos.clone();
  this.triggerEvent("backToIdle");

  this.blink();

  this.isInitiated = true;

};


CPU.prototype.getRenderTarget = function(){
  return this.renderTarget;
};


CPU.prototype.updateFaceMorph = function( reset ){
  for( var index in this.expressions) {
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

      TweenMax.to(obj,0.3,{delay:1,weight:1, onCompleteScope:obj, onComplete:function(){
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

  /*if( settings.data.testCPUMorph > -1 ) {
    //reset morph targets
    for (var i = this.bear.body.morphTargetInfluences.length - 1; i >= 0; i--) {
      this.bear.body.morphTargetInfluences[i] = 0;
    };

    this.bear.body.morphTargetInfluences[settings.data.testCPUMorph] = 1;
    this.bear.body.updateAnimation(0);
    this.currentAnimLabel = "idle"
    return;
  }*/

  time *= this.settings.trembleSpeed;

  var delta = Date.now()-this.lastTime;
  this.lastTime = Date.now();

  //end ongoing animations
  if( !this.expressionActive && this.bear.body.currentKeyframe >= this.bear.body.geometry.animations[this.currentAnimLabel].end) {
    this.isAnimating = false
    this.currentAnimLabel = "idle"
    this.bear.body.playAnimation("idle",24);
    this.bear.body.updateAnimation(0);
  }

  //update expression
  if( this.currentAnimLabel == "idle" && !this.expressionActive ) {
    var weight = (Math.sin(time*0.7)+1)/2
    getExpressionByLabel(this.expressions,"idle2").weight = weight;
    if( weight > 0.99  ) this.bear.body.morphTargetInfluences[this.blinkFrame] = 1;
    else this.bear.body.morphTargetInfluences[this.blinkFrame] = 0;

    this.updateFaceMorph();
  }
  else if( this.expressionActive ) {
    getExpressionByLabel(this.expressions,"idle2").weight = 0;
    this.updateFaceMorph();
  }

  this.bear.body.updateAnimation(delta);

  if( !this.isAnimating ) {

    var bounces = 0;
    for( var obj in world.puckBounces ) {
      bounces += world.puckBounces[obj]
    }

    this.settings.concentrate = Math.min(bounces/20,1);


    this.bear.position.lerp( this.targetPos.set(
      (this.settings.lookX-0.5)*40,
      this.settings.initPos.y + ImprovedNoise.noise(0,time,0)*this.settings.tremble - this.settings.concentrate*15,
      this.settings.initPos.z + this.settings.concentrate*15),
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
  this.paw.position.x = -40 + value*3;
  this.paw2.position.x = 40 + value*3;

  this.paw.rotation.y = Math.PI + value*0.1;
  this.paw2.rotation.y = Math.PI + value*0.1;

  if( Math.abs(value-this.lastX) < 0.002) {
    this.paw.position.y += (-55-this.paw.position.y)*0.3;
    this.paw2.position.y += (-55-this.paw2.position.y)*0.3;

    this.paw.rotation.z += (0-this.paw.rotation.z)*.3;
    this.paw2.rotation.z += (0-this.paw2.rotation.z)*.3;

  }
  else if(this.lastX > value ) {
    this.paw.position.y += (-66-this.paw.position.y)*.3;
    this.paw2.position.y += (-55-this.paw2.position.y)*.3;

    this.paw.rotation.z += (0.3-this.paw.rotation.z)*.3;
    this.paw2.rotation.z += (0-this.paw2.rotation.z)*.3;

  }
  else {
    this.paw2.position.y += (-60-this.paw2.position.y)*.3;
    this.paw.position.y += (-55-this.paw.position.y)*.3;

    this.paw2.rotation.z += (-0.3-this.paw2.rotation.z)*.3;
    this.paw.rotation.z += (0-this.paw.rotation.z)*.3;

  }

  this.settings.lookX = value

  this.lastX = value;
}

CPU.prototype.blink = function(){

  //this.updateFaceMorph(true);

  if( settings.data.testCPUMorph > -1 ) return;
/*
  setTimeout(doBlink.bind(this),Math.random()*2000)

  function doBlink() {

    if( this.currentAnimLabel == "idle") {

      this.currentAnimLabel = "blink"

      this.bear.body.morphTargetInfluences[this.blinkFrame] = 1;

    }

    setTimeout(function(){
        if( this.currentAnimLabel == "blink" ) {
          this.bear.body.morphTargetInfluences[this.blinkFrame] = 0;
          this.currentAnimLabel = "idle"
        }
      }.bind(this),100)

    this.blink();
  }
  */
}

CPU.prototype.playSequence = function(label){

  //reset morph targets
  for (var i = this.bear.body.morphTargetInfluences.length - 1; i >= 0; i--) {
    this.bear.body.morphTargetInfluences[i] = 0;
  };

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
      var choice = Math.ceil(Math.random()*4);

      if( choice == 1 ) {
        dmaf.tell("opponent_animation_win_happy")
        this.playSequence("happy")

      } else if( choice == 2){
        dmaf.tell("opponent_animation_win_jump")
        tween = TweenMax.to(this.bear.position,0.3,{y:this.settings.initPos.y+50, yoyo:true, repeat:5, ease:Sine.easeOut})

        tween.vars.onComplete = function() {
          this.isAnimating = false;
        }.bind(this);
      }
      else if( choice == 3 ) {
        this.setExpression("blink1");

        TweenMax.to(this.paw.position,1.25,{y:-50});
        TweenMax.to(this.paw2.position,1.25,{y:-50});


      }
      else if( choice == 4 ) {
        this.setExpression("blink2");

        TweenMax.to(this.paw.position,1,{delay:1,x:-20,y:-63});
        TweenMax.to(this.paw2.position,1,{delay:1,x:20,y:-63});

        TweenMax.to(this.paw.rotation,0.75,{delay:1.25,z:Math.PI*-0.4});
        TweenMax.to(this.paw2.rotation,0.75,{delay:1.25,z:Math.PI*0.4});
      }


      break;
    case "loose":

      var choice = Math.ceil(Math.random()*6);

      if( choice == 1 ) {
        dmaf.tell("opponent_animation_loose_sad")
        this.bear.body.playAnimation("sad",24);
        this.bear.body.updateAnimation(0);
        this.currentAnimLabel = 'sad'

      }
      else if( choice == 2){
        //walk out
        dmaf.tell("opponent_animation_loose_walkaway")
        TweenMax.to(this.bear.position,0.2,{y:this.settings.initPos.y - 80,ease:Sine.easeInOut});
        TweenMax.to(this.bear.rotation,.2,{y:Math.PI*-0.5, ease:Back.easeOut, onComplete:function(){

          TweenMax.to(this.bear.position,3.2/15,{y:this.settings.initPos.y - 120, repeat:5,yoyo:true, ease:Sine.easeInOut})

          TweenMax.to(this.bear.position,3.2,{overwrite:"none", x:-650, onComplete:function(){
            this.isAnimating = false;
            this.triggerEvent("backToIdle");

          }.bind(this)})
        }.bind(this)})

        TweenMax.to(this.paw.position,0.2,{y:"-80"});
        TweenMax.to(this.paw2.position,0.2,{y:"-80"});


      }
      else if( choice == 3 ){
        //fall
        dmaf.tell("opponent_animation_loose_fall")
        tween = TweenMax.to(this.bear.position,5,{y:this.settings.initPos.y-500, ease:Sine.easeOut})

        //tween = TweenMax.to(this.bear.rotation,3,{overwrite:"none",x:Math.PI*-.1, ease:Sine.easeIn})

        tween.vars.onComplete = function() {
          this.isAnimating = false;
          this.triggerEvent("backToIdle");
        }.bind(this)

        TweenMax.to(this.paw.position,0.2,{y:"-80"});
        TweenMax.to(this.paw2.position,0.2,{y:"-80"});

      }
      else if( choice == 4 ) {
        this.setExpression("angryEye");
      }
       else if( choice == 5 ) {
        this.setExpression("anxious");
      }
       else if( choice == 6 ) {
        this.setExpression("jawdrop");
      }

      break;
    case "backToIdle":

      dmaf.tell("opponent_animation_backtoidle")

      //TweenMax.to(this.paw.position,0.2,{y:70});
      //TweenMax.to(this.paw2.position,0.2,{y:70});

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