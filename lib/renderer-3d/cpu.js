var  ImprovedNoise = require('./improved-noise')
  , Geometry = require('../geometry');

module.exports = CPU;

function CPU(renderer) {

  this.width = 640;
  this.height = 360;

  this.renderer = renderer;

  this.init3D();
  
  //export
  this.texture = this.renderTarget;

  this.settings = {
    charactersIndexes:[0,1],
    characters: [
      {
        name: "Clem",
        bodyMesh: "models/CPU/cpu.js",
        staticMesh: "models/CPU/horn.js",
        initPos: new THREE.Vector3(0,-200,0),
        scale: 6
      }
     /* , {
        name: "Hal",
        bodyMesh: "models/CPU_2/cpu.js",
        staticMesh: "models/CPU_2/feathers.js",
        initPos: new THREE.Vector3(0,-50,0),
        scale: 2
      }*/
    ],

    sad:0.5,
    happy:1.0,
    tremble:5.4,
    trembleSpeed:0.4,
    lookX:0.5,
    concentrate:0,
    win: function(){
      this.triggerEvent('win')
    }.bind(this),
    loose: function(){
      this.triggerEvent('loose')
    }.bind(this),
    walkOut: function(){
      this.triggerEvent('walkOut')
    }.bind(this)
  }

  this.nextCharacter = 1;
  this.currentCharacterData = null;
  this.loadCharacter(this.nextCharacter );

  this.isAnimating = false;

  //backdrop
  /*this.backdropMesh = new THREE.Mesh( new THREE.PlaneGeometry(640*2.7,360*2.7,2,2), new THREE.MeshBasicMaterial({map:THREE.ImageUtils.loadTexture("images/backdrop.jpg")}));
  this.backdropMesh.position.z = -450;
  this.scene.add(this.backdropMesh);
*/
}


CPU.prototype.init3D = function(  ){

  this.scene = new THREE.Scene();

  var camera = new THREE.PerspectiveCamera( 60, this.width / this.height, 1, 10000 );
  camera.position.z = 300
  camera.position.y = 0

  //point camera on scene
  camera.lookAt(new THREE.Vector3(0,0,0))

  this.camera = camera;

  this.renderTarget = new THREE.WebGLRenderTarget( this.width, this.height,  { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat, useStencilBuffer:false } );

  var light = new THREE.DirectionalLight( 0xffffff );
  light.position.set( 0, 0, 1 ).normalize();
  this.scene.add( light );

}

CPU.prototype.initGUI = function( gui ){
 // gui.add( this.settings, 'happy',0,1).onChange( function(value){this.setMorphTarget(0, value)}.bind(this) );
  gui.add( this.settings, 'charactersIndexes',['Clem','Hal']).onChange( function(value){
    if( value == "Clem") this.nextCharacter = 1;
    else if( value == "Hal") this.nextCharacter = 2;
    this.triggerEvent("walkOut");
  }.bind(this) );
  gui.add( this.settings, 'sad',0,1).onChange( function(value){this.setMorphTarget(0, value);}.bind(this) );
  gui.add( this.settings, 'tremble',0,20);
  gui.add( this.settings, 'trembleSpeed',0,2);
  gui.add( this.settings, 'lookX',0,1);
  gui.add( this.settings, 'concentrate',0,1);
  gui.add( this.settings, 'win' );
  gui.add( this.settings, 'loose' );
  gui.add( this.settings, 'walkOut' );
}


CPU.prototype.loadCharacter = function( index ){

  var avatar = new THREE.Object3D();

  var data = this.settings.characters[index-1];

  this.currentCharacterData = data;
  //load mesh 1

  //var loader = new THREE.JSONLoader( true );
  //loader.load( data.bodyMesh, function( geometry, materials ) {


    for (var i = Geometry.cpu.materials.length - 1; i >= 0; i--) {
      Geometry.cpu.materials[i].morphTargets = true;
    };

    var body = new THREE.Mesh( Geometry.cpu, new THREE.MeshFaceMaterial( Geometry.cpu.materials ) );
    avatar.add( body );
    avatar.body = body;

    //hand?
    if( index == 1 ) {

      var handMesh = new THREE.Mesh( new THREE.SphereGeometry( 40, 3, 4  ), new THREE.MeshLambertMaterial( {color:Geometry.cpu.materials[0].color} ));
      handMesh.position.z = 180;
      handMesh.position.y  = -90;
      this.scene.add(handMesh);   
      this.hand = handMesh;
    }

    
  //}.bind(this) );

  //load static
 /* var loader2 = new THREE.JSONLoader( true );
  loader2.load( data.staticMesh, function( geometry , materials) {
    var horn = new THREE.Mesh( geometry, new THREE.MeshFaceMaterial( materials )  );
    avatar.add( horn );
  }.bind(this) );*/


  avatar.scale.set(data.scale,data.scale,data.scale);
  this.scene.add(avatar);
  this.avatar = avatar;

  this.nextCharacter = null;
  avatar.position = data.initPos.clone();
  this.triggerEvent("backToIdle")


};


CPU.prototype.setMorphTarget = function( morphTargetIndex, value){
  if( this.avatar.body ) this.avatar.body.morphTargetInfluences[ morphTargetIndex ] = value;
  
  if( morphTargetIndex == 0 ) {
    this.avatar.position.y =  this.currentCharacterData.initPos.y - value*30; 
  }
}


CPU.prototype.getRenderTarget = function(){
  return this.renderTarget;
};

CPU.prototype.update = function(time){
  //this.avatar.rotation.y += 0.1

  time *= this.settings.trembleSpeed;

  if( !this.isAnimating ) {

    this.avatar.position.x = ImprovedNoise.noise(time,0,0)*this.settings.tremble;
    this.avatar.position.y = this.currentCharacterData.initPos.y + ImprovedNoise.noise(0,time,0)*this.settings.tremble;
    //this.avatar.position.z = improvedNoise.noise(0,0,time)*this.settings.tremble;
    this.avatar.rotation.y = (this.settings.lookX-0.5)*40*Math.PI/180;
    //this.avatar.position.x += (this.settings.lookX-0.5)*-80;

    this.avatar.position.z = this.settings.concentrate*150;
    this.avatar.rotation.x = this.settings.concentrate*5*Math.PI/180;
    this.avatar.position.y -= this.settings.concentrate*50;
  }

};

CPU.prototype.render = function(){

  this.renderer.render( this.scene, this.camera,  this.renderTarget,true);

};

CPU.prototype.setPaddleX = function( value ) {
  if( this.hand ) this.hand.position.x = value*.1-100;
}

CPU.prototype.triggerEvent = function( label ){
  
  if( this.isAnimating && label != "backToIdle" ) return;

  var tween;

  switch( label ) {

    case "win":

      this.setMorphTarget(0, 0);

      tween = TweenMax.to(this.avatar.position,0.2,{y:"50", yoyo:true, repeat:5, ease:Sine.easeOut})

      tween.vars.onComplete = function() {
        setTimeout(function(){
          this.isAnimating = false
          this.setMorphTarget(0, 0.5);
        }.bind(this),500); 
      }.bind(this);

      break;
    case "loose":

      this.setMorphTarget(0, 1);

      TweenMax.to(this.avatar.position,0.2,{y:"50",z:50, ease:Sine.easeOut, onComplete:function(){
        TweenMax.to(this.avatar.position,0.6,{y:"-300", ease:Sine.easeIn})  
      }.bind(this)})
      
      tween = TweenMax.to(this.avatar.rotation,1.8,{overwrite:"none",y:Math.PI*-0.5,x:Math.PI*-.6, ease:Sine.easeIn})
      
      tween.vars.onComplete = function() {
        this.triggerEvent("backToIdle");
      }.bind(this)

      if( this.hand) {
        TweenMax.to(this.hand.position,0.2,{y:"-80"});
      }

      break;
    case "walkOut":
      
     TweenMax.to(this.avatar.rotation,.2,{y:Math.PI*-0.5, ease:Back.easeOut, onComplete:function(){
        
        TweenMax.to(this.avatar.position,3.2/15,{y:"50", yoyo:true, repeat:5, ease:Sine.easeInOut})

        TweenMax.to(this.avatar.position,3.2,{overwrite:"none", x:-650, onComplete:function(){

          this.triggerEvent("backToIdle");
               
        }.bind(this)}) 
     }.bind(this)})
      
      if( this.hand) {
        TweenMax.to(this.hand.position,0.2,{y:"-80"});
      }

      break;
    case "backToIdle":

      if( this.nextCharacter > 0 ) {
        //TweenMax.killAll()
        this.scene.remove(this.avatar);
        this.avatar = null;
        if(this.hand) this.scene.remove(this.hand);
        this.hand = null;
        this.loadCharacter(this.nextCharacter);
        return;
      } 

      if( this.hand) {
        TweenMax.to(this.hand.position,0.2,{y:"80"});
      }

      this.setMorphTarget(0, 0.5);
      this.avatar.position = this.currentCharacterData.initPos.clone()
      this.avatar.position.y -= 600;

      this.avatar.rotation.set(0,0,0);

      TweenMax.to(this.avatar.position,0.5,{ y:this.currentCharacterData.initPos.y, ease:Back.easeOut, onComplete:function(){
          this.isAnimating = false; 
      }.bind(this)}) 
      
      break;

  }

  this.isAnimating = true;
}