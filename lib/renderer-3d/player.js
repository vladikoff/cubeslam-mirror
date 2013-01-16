var settings = require('../settings')
  , shaders = require('../shaders')
  , debug = require('debug')('renderer:3d:player')
  , ObjectPool = require('./object-pool')
  , world = require('../world')
  , Materials = require('./materials');

module.exports = Player;

// Player()
//   - cube (VideoCube/Cube)
//   - paddle
//   - shield
//   #update(player)

Player.CubeStateIdle = "idle";
Player.CubeStateHidden = "hidden";
Player.CubeStateUp = "up";

Player.CubeMaterialIdle = "arenaBorder"
Player.CubeMaterialCPU = "cpu"
Player.CubeMaterialNoise = "staticNoise"
Player.CubeMaterialRemote = "remoteVideo"
Player.CubeMaterialLocal = "localVideo"


function Player(renderer,id){
  debug('new')
  this.time = 0;
  this.id = id;
  this.renderer = renderer;
  this.host = (id == 0)
  this.columns = new Array(settings.data.arenaColumns)
  this.cube = createCube(renderer,id);
  this.cubePosition = Player.CubeStateIdle;
  this.cubeMaterial = null;

  this.noiseAmount = 0;
  this.videoMaterial = null;

  this.reflection = createReflectionPlane(renderer,id);
  
  this.shieldContainer = new THREE.Object3D();
  renderer.env.arena.add(this.shieldContainer);
  
  this.shields = [];
  this.initShields();

  this.paddle = createPaddle(renderer,id)

  this.reset()

  this.cameraPlayPosition = {
    origin:{
      x: 0,
      y: settings.data.arenaSurfaceY+settings.data.arenaSideHeight*2+300,
      z: id == 0
      ? this.cube.position.z + 500 // a
      : this.cube.position.z - 500 // b
    },

    target:{
      x: 0, // b
      y: 0,
      z: id == 0
        ? 300 // a
        : -300 // b
    }
  };

   this.cameraPaddleSetupPosition = {
    origin:{
      x: id == 0
        ? -600
        : 600,
      y: 1600,
      z: id == 0
        ? -200 // a
        : 200 // b
    },
    target:{
        x: id == 0
        ? 0
        : 0,
      y: 300,
      z: id == 0
        ? 1500 // a
        : -1500 // b
    }
  };

   this.cameraWaitingPosition = {
    origin:{
      x: id == 0
        ? -2500
        : 2500,
      y: 1200,
      z: id == 0
        ? 0 // a
        : 0 // b
    },
    target:{
        x: id == 0
        ? -500
        : 500,
      y: 0,
      z: id == 0
        ? 0 // a
        : -0 // b
    }
  };

  //this.reset();

  debug('camera position',this.cameraPosition)
}

Player.prototype = {

  reset: function(){
    debug('reset')

    var w = settings.data.arenaWidth
      , h = w / 16*9
      , hh = h/2
      , d = settings.data.arenaHeight
      , hd = d/2
      , sideH = settings.data.arenaSideHeight;

    // reset columns
    for (var i=0; i < settings.data.arenaColumns; i++)
      this.columns[i] = 0;

    this.host = this.id == 0;

    // reset cube position
    //this.cube.position.x = 0
    //this.cube.position.y = -hh
    this.cube.position.z = this.host
      ? +hd + settings.data.videoBoxDepth*.5 + 2 // a
      : -hd - settings.data.videoBoxDepth*.5 - 2 // b

   // this.reflection.scale.y = -0.2;
    this.reflection.position.z = this.host
      ? +hd-2 // a
      : -hd+2;  // b
    this.reflection.rotation.y = Math.PI*(this.host?0:1);

    this.reflection.mask.position.z = this.host
      ? +hd-10 // a
      : -hd+10;  // b

    // reset shield position
    
    this.shieldContainer.position.z = this.host
      ? +hd-10  // a
      : -hd+10; // b

    this.shieldContainer.rotation.y = Math.PI*(this.id == 1?1:0);

    // reset paddle position
    this.paddle.position.x = 0;

    this.paddle.offsetZ = 0;
    this.paddle.offsetX = 0;

  },

  gotoIdleState: function() {
    if( this.cubePosition != Player.CubeStateIdle) {
      this.show(true,function(){} )
    }
  },

  setMaterial: function( newMaterial, hideCube ){

    //change without transition
    if( hideCube ) {
      //do hide transition first
      this.hide(true,function(){} )
    }
    else {
      //do hide transition first

      this.hide(true, function() {
        this.cube.geometry.materials[4] = Materials[newMaterial];

        //setup material if cpu or remoteVideo
        if( newMaterial == Player.CubeMaterialRemote || newMaterial == Player.CubeMaterialCPU ) {

          if( !this.brokenCtx ) {
            var canvas = document.createElement("canvas");
            canvas.width = 512;
            canvas.height = 512;
            this.brokenCtx = canvas.getContext("2d");
            this.brokenTexture = new THREE.Texture( canvas );

          }

          this.brokenCtx.fillStyle =  "rgba(0, 0, 0, 1)";
          this.brokenCtx.fillRect(0,0, 512, 512);
          this.brokenTexture.needsUpdate = true;

          this.videoMaterial = Materials[newMaterial];
          this.videoMaterial.uniforms.tBroken.value = this.brokenTexture;
          
        }
        else {
          this.videoMaterial = null;
        }

        this.reflection.material = Materials[newMaterial];
        this.show( newMaterial == Player.CubeMaterialIdle );

    }.bind(this) )}



    //then show (idle or up)


  },

  show: function( toIdle ){

    var h = settings.data.arenaWidth/16*9;

    if( this.cubePosition == Player.CubeStateUp && !toIdle ) return;

    this.cubePosition = toIdle?Player.CubeStateIdle:Player.CubeStateUp;

     new TWEEN.Tween(this.cube.position)
      .to({y: toIdle?-h*.5+settings.data.arenaSideHeight:h*.35 },1000)
      .start();

      var refl = this.reflection;
      new TWEEN.Tween(this.reflection.scale)
      .to({y: toIdle?-0.2:-1 },1000)
      .onUpdate(function(){
        var offsetY = this.y+1;
        refl.geometry.faceVertexUvs[0][0] = [
          new THREE.UV( 0,1 ),
          new THREE.UV( 0, 0+offsetY ),
          new THREE.UV( 1, 0+offsetY),
          new THREE.UV( 1, 1 )
        ]
        refl.geometry.uvsNeedUpdate = true;
      })
      .start();


  },

  hide: function( hideCompletely, callback ){

    if( !callback ) callback = {};

    var h = settings.data.arenaWidth/16*9;

    if( this.cubePosition == Player.CubeStateHidden ) return;

    this.cubePosition = hideCompletely?Player.CubeStateHidden:Player.CubeStateIdle;

    new TWEEN.Tween(this.cube.position)
      .to({y: -h*.5 + (hideCompletely?5:settings.data.arenaSideHeight)},1000)
      .onComplete(callback)
      .start();


    var refl = this.reflection;
    new TWEEN.Tween(this.reflection.scale)
    .to({y: (hideCompletely?-0.01:-0.2) },1000)
    .onUpdate(function(){

      var offsetY = this.y+1;
      refl.geometry.faceVertexUvs[0][0] = [
        new THREE.UV( 0,1 ),
        new THREE.UV( 0, 0+offsetY ),
        new THREE.UV( 1, 0+offsetY ),
        new THREE.UV( 1, 1 )
      ]

      refl.geometry.uvsNeedUpdate = true;
    })
    .start();
  },

  update: function(player,paddle){
    var w = settings.data.arenaWidth
      , h = settings.data.arenaHeight
      , hw = w*.5
      , hh = h*.5

    // paddle position
    if (paddle) {
      var x = paddle.current[0]-hw
        , y = paddle.current[1]-hh;
      this.paddle.position.x = x+this.paddle.offsetX;


      this.paddle.scale.x = (paddle.aabb[1] - paddle.aabb[3])/100;
      //in simulation, paddle is half way outside
      var paddleDepth = (paddle.aabb[2] - paddle.aabb[0])

      this.paddle.position.z = y+this.paddle.offsetZ+(paddleDepth/8*3)*(this.id ? 1 : -1);
      this.paddle.scale.z = paddleDepth/400;
    }

   /* var uniforms = this.shield.material.uniforms;

    this.time += 0.05;

    // shield brightness
    if( uniforms.uBrightness.value > 0.25 )
      uniforms.uBrightness.value *= 0.97;

    // shield hits
     for(var i=0; i < this.columns.length; i++)
       this.columns[i] = 0;
     for(var i=0; i < player.hits.length; i++ ){
       var c = Math.floor((player.hits[i]/settings.data.arenaWidth)*this.columns.length);
       this.columns[c] = 1;
     }*/

  },

  heal : function(){

   /* var scope = this;
    new TWEEN.Tween({amount:0})
    .to({amount:1})
    .onUpdate(function(){
      scope.shield.material.uniforms.uHealAmount.value = this.amount;
    })
    .onComplete( function(){

        world.players[(scope.id == 0)? "a":"b"].hits.length = 0;
        //world.players[(scope.id == 0)? "a":"b"].score = 0;
        new TWEEN.Tween({amount:1})
        .to({amount:0})
        .onUpdate(function(){
          
          scope.shield.material.uniforms.uHealAmount.value = this.amount;
        })
        .start();
    })
    .start();*/
  },

  /*resetShield : function(){
    var scope = this;
    new TWEEN.Tween(this.shield.scale)
      .to({y:0},300)
      .onComplete( function(){

         new TWEEN.Tween(scope.shield.scale)
          .to({y:1},500)
          .start();

      }).start();

  },*/

  hit : function( normalizedImpactX ){
    
    if( this.videoMaterial == null ) return;

    TweenMax.killDelayedCallsTo(this.breakPixel)
    TweenMax.killTweensOf(this)

    this.videoMaterial.uniforms.time.value = Math.random()*1.4;
    this.videoMaterial.uniforms.noiseAmount.value = 1;

    this.noiseAmount = 0;
    TweenMax.to(this,0.1,{
      noiseAmount:1,
      ease:Sine.easeOut,

      onUpdate:function(){
        this.videoMaterial.uniforms.noiseAmount.value = this.noiseAmount;
      }.bind(this), 

      onComplete:function(){

        var totalPixelsDead = 5;
        for (var i =0; i < totalPixelsDead; i++) {
          TweenMax.delayedCall( i*0.05, this.breakPixel, [normalizedImpactX,i/totalPixelsDead*0.8],this )
        };

        TweenMax.to(this,1,{
          noiseAmount:0,
          delay:1,
          ease:Elastic.easeIn,
          onUpdate:function(){
            this.videoMaterial.uniforms.noiseAmount.value = this.noiseAmount;
          }.bind(this)
        })
      }.bind(this)
    })
  }, 

  breakPixel : function( impactPointX , impactPointY ){

    var totalColumns = 16;
    var totalRows = 9;

    var gridSizeX = 512/totalColumns; 
    var gridSizeY = 512/totalRows; 
    
    this.brokenCtx.lineWidth = 1;
    
    var indexY = totalRows - Math.floor(impactPointY*totalRows);
    var indexX = Math.floor(impactPointX*totalColumns) + Math.floor(Math.random()*indexY)-Math.floor(indexY*.5);
    

    this.brokenCtx.strokeStyle =  "rgba(128, 0, 0, 1)";
    this.brokenCtx.strokeRect(gridSizeX*indexX-0.5, 512/totalRows*indexY-0.5, gridSizeX, gridSizeY);

    this.brokenCtx.fillStyle =  "rgba(255, 0, 0, 1)";
    this.brokenCtx.fillRect(gridSizeX*indexX, 512/totalRows*indexY, gridSizeX, gridSizeY);

    this.brokenTexture.needsUpdate = true;
    
  },

  initShields : function() {

    //create equaly amount shields as columns;
    for(var i=0; i < settings.data.arenaColumns; i++) {
      var shield = createShield();
      this.shieldContainer.add(shield)
      this.shields.push(shield);
    }

    this.resetShields();
  },

  setShields : function( count ) {
    this.resetShields();

    for(var i=0; i < count; i++) {
      var shield = this.shields[i];
      shield.visible = true;
      shield.scale.x = settings.data.arenaWidth/count/100;
      shield.position.x = -settings.data.arenaWidth*.5 + i*settings.data.arenaWidth/count;
    }
  },

  resetShields: function(){
    for(var i=0; i < settings.data.arenaColumns; i++) {
      var shield = this.shields[i];
      shield.visible = false;
    }
  }

}



/*function createShield(renderer,columns, host ){
  debug('create shield')
  var w = settings.data.arenaWidth
    , h = settings.data.arenaSideHeight
  var shieldGeo = new THREE.CubeGeometry(w,h,16,1,1,1,null, { px: false, nx: false, py: true, ny: false, pz: this.id==0?false:true, nz: this.id==0?true:false })
  shieldGeo.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(0, h*.5, 0)));

  // TODO refactor shield material into materials?
  var shieldMat = new THREE.ShaderMaterial({
    blending: THREE.NormalBlending,
    depthWrite:false,
    side:THREE.DoubleSide,
    transparent: true,
    uniforms: {
      resolution: { type: "v2", value: new THREE.Vector3(900,300)},
      uColumns: { type:"f", value: columns.length},
      uColumnValues: { type: "fv1", value: columns},
      uBrightness:  { type: "f", value: 1.0 },
      tVideo: { type: "t", value: !host?Materials.localVideoTexture:Materials.remoteVideoTexture },
      uColor: { type: "c", value: new THREE.Color( settings.theme.shieldColor ) },
      uHealColor: { type: "c", value: new THREE.Color(0x4daf4d ) },
      uHealAmount: { type: "f", value: 0 }
    },
    vertexShader: shaders.simple_vs,
    fragmentShader: shaders.shield_fs
  })

  var shieldMesh = new THREE.Mesh(shieldGeo, shieldMat)
  shieldMesh.name = 'shield'
  shieldMesh.rotation.y = Math.PI*(this.id == 1?1:0);
  renderer.env.arena.add(shieldMesh);
  return shieldMesh;
}*/

function createCube(renderer,id){
  debug('create cube')

  var w = settings.data.arenaWidth
    , h = w/16*9;

  var cubeGeo = new THREE.CubeGeometry(w-20,h,settings.data.videoBoxDepth-10,1,1,1,id==0?Materials.playerACube:Materials.playerBCube)
    , cubeMat = new THREE.MeshFaceMaterial()
    , cube = new THREE.Mesh(cubeGeo, cubeMat);

  cube.position.y = -h*.5+settings.data.arenaSideHeight;
  //decal
  var decalGeo = new THREE.PlaneGeometry(350,350,1,1);
  var decalMesh = new THREE.Mesh( decalGeo,Materials.decal)
  //decalMesh.material.map.repeat.x = 0.5;
  decalMesh.material.map.repeat.y = 0.5;
  decalMesh.material.map.offset.y = 0.5;
  decalMesh.position.x = 560;
  decalMesh.position.z = -70;
  decalMesh.rotation.x = -Math.PI*.5;
  decalMesh.position.y = h*.5+1

  if( id == 0) {
    decalGeo.faceVertexUvs[0][0] = [
      new THREE.UV( 0,1 ),
      new THREE.UV( 0, -0.01 ),
      new THREE.UV( 0.5, -0.01 ),
      new THREE.UV( 0.5, 1 )
    ] 
  }
  else {
    decalGeo.faceVertexUvs[0][0] = [
      new THREE.UV( 0.5,1 ),
      new THREE.UV( 0.5, -0.01 ),
      new THREE.UV( 1, -0.01 ),
      new THREE.UV( 1, 1 )
    ] 
  }

  decalGeo.uvsNeedUpdate = true;

  cube.add(decalMesh);
  cube.name = 'cube'+id
  renderer.env.arena.add(cube);

  setTimeout(function(){cube.geometry.materials[4] = Materials.arenaBorder},500);

  return cube;
}

function createReflectionPlane(renderer,id){
  debug('create reflection plane')

  var w = settings.data.arenaWidth
    , h = w/16*9;

  var planeGeo = new THREE.PlaneGeometry(w-20,h,1,1);
  planeGeo.faceVertexUvs[0][0] = [
    new THREE.UV( 0,1 ),
    new THREE.UV( 0, 0.8 ),
    new THREE.UV( 1, 0.8 ),
    new THREE.UV( 1, 1 )
  ]

  planeGeo.uvsNeedUpdate = true;

  planeGeo.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(0, h*.5, 0)));
  var plane = new THREE.Mesh(planeGeo, id==0?Materials.playerACube[4]:Materials.playerBCube[4]);

  //workaround to assign attributes needed in nex
  setTimeout( function(){ plane.material = Materials.arenaBorder},300);

  plane.name = 'plane'+id
  plane.opacity=1;
  plane.scale.y = -0.8;

  var gradientPlaneGeo = new THREE.PlaneGeometry(w-20,h+40,1,1);
  gradientPlaneGeo.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(0, h*.5, 0)));
  var gradientPlane = new THREE.Mesh(gradientPlaneGeo, Materials.gradientPlane);
  gradientPlane.name = 'gradientPlane'
  gradientPlane.position.set(0,-h-20,settings.data.arenaHeight*-.5+7)
  renderer.env.arena.add(gradientPlane);
  renderer.env.arena.add(plane);

  plane.mask = gradientPlane;

  return plane;
}

function createPaddle(renderer, id){
  debug('create paddle')
  var w = settings.data.arenaWidth
    , h = settings.data.arenaHeight
    , hw = w*.5
    , hh = h*.5
    , paddleGeo = new THREE.CubeGeometry( 100, settings.data.puckRadius*4, 100 )
    , paddle = new THREE.Mesh( paddleGeo, Materials.paddle );
  
  paddle.name = 'paddle'+id
  paddle.scale.x = settings.data.unitSize*4/100;

  var paddleDepth = settings.data.puckRadius*8;

  paddle.position.z = (hh-(paddleDepth/8*3))*(id==0 ? 1 : -1);
  
  renderer.env.arena.add(paddle);
  return paddle;

}

function createShield() {
  
  var geo = new THREE.CubeGeometry(99.5,settings.data.arenaSideHeight,10,1,1,1, Materials.shield, { px: true, nx: true, py: true, ny: false, pz: true, nz: true });
  geo.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(50, settings.data.arenaSideHeight*.5, 0)));

  var shield = new THREE.Mesh( geo, new THREE.MeshFaceMaterial() );

  shield.visible = false;

  return shield;
}

