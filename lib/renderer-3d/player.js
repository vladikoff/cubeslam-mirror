var settings = require('../settings')
  , shaders = require('../shaders')
  , debug = require('debug')('renderer:3d:player')
  , ObjectPool = require('./object-pool')
  , Materials = require('./materials');

module.exports = Player;

// Player()
//   - cube (VideoCube/Cube)
//   - paddle
//   - shields
//   #update(player)

Player.CubeStateIdle = "idle";
Player.CubeStateHidden = "hidden";
Player.CubeStateUp = "up";

function Player(renderer,id){

  debug('new')
  this.time = 0;
  this.id = id;
  this.renderer = renderer;
  this.arena = renderer.env.arena;
  this.host = (id == 0)
  this.columns = new Array(settings.data.arenaColumns)
  this.idlePlane = createIdlePlane();
  this.cube = createCube(id);
  this.arena.add(this.cube)
  this.decal = createDecal(this.cube);
  this.cubePosition = Player.CubeStateIdle;

  this.cube.add(this.idlePlane)

  //exploding voxels
  this.voxelsGridSize = new THREE.Vector3( 10, 6, 5 );
  this.voxelsExploding = [];
  this.voxelsAll = null;
  this.voxelsContainer = null;
  this.gravity = -45.5; // px / second^2
  this.collisionDamper = 0.5; // 20% energy loss
  this.lastTime = Date.now();


  this.noiseAmount = 0;
  this.videoMaterial = null;

  this.reflection = createReflectionPlane(renderer,id);

  this.paddle = createPaddle(renderer,id)

  this.reset()

  this.setDecal( this.id );

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

    // reset paddle position
    this.paddle.position.x = 0;

    this.paddle.offsetZ = 0;
    this.paddle.offsetX = 0;

    Materials.opponent.brokenTextureCtx.fillStyle =  "rgba(0, 0, 0, 1)";
    Materials.opponent.brokenTextureCtx.fillRect(0,0, 512, 512);
    Materials.opponent.uniforms.tBroken.value.needsUpdate = true;

  },

  setCubePosition: function( mirrored  ) {
    //position cube
    var d = settings.data.arenaHeight
      , hd = d/2

    if( mirrored ) {
      this.cube.position.z = -hd - settings.data.videoBoxDepth*.5 - 2
      this.cube.rotation.y = 0
      this.reflection.position.z = -hd+2
      this.reflection.rotation.y = Math.PI;
      this.reflection.mask.position.z = -hd+10;

    }
    else {
      this.cube.position.z = +hd + settings.data.videoBoxDepth*.5 + 2
      this.cube.rotation.y = Math.PI
      this.reflection.position.z = +hd-2
      this.reflection.rotation.y = 0;
      this.reflection.mask.position.z = +hd-10;
    }
  },

  setDecal: function( id ) {
     //set decal uv
    var decalGeo = this.decal.geometry;

    if( id == 0) {
      decalGeo.faceVertexUvs[0][0] = [
        new THREE.Vector2( 0,1 ),
        new THREE.Vector2( 0, -0.01 ),
        new THREE.Vector2( 0.5, -0.01 ),
        new THREE.Vector2( 0.5, 1 )
      ]
    }
    else {
      decalGeo.faceVertexUvs[0][0] = [
        new THREE.Vector2( 0.5,1 ),
        new THREE.Vector2( 0.5, -0.01 ),
        new THREE.Vector2( 1, -0.01 ),
        new THREE.Vector2( 1, 1 )
      ]
    }
    decalGeo.uvsNeedUpdate = true;
  },

  gotoIdleState: function() {
    if( this.cubePosition != Player.CubeStateIdle) {
      this.show(true,function(){} )
    }
  },

  show: function( toIdle ){

    var h = settings.data.arenaWidth/16*9;

    if( this.cubePosition == Player.CubeStateUp && !toIdle ) return;

    this.cubePosition = toIdle?Player.CubeStateIdle:Player.CubeStateUp;

    this.idlePlane.visible = (toIdle==1)?true:false;

    TweenMax.to( this.cube.position, 1, {y: toIdle?-h*.5+settings.data.arenaSideHeight:h*.35 })

    TweenMax.to( this.reflection.scale, 1,{y: toIdle?-0.2:-1 , onUpdate: function(){
      var offsetY = this.reflection.scale.y+1;
      this.reflection.geometry.faceVertexUvs[0][0] = [
        new THREE.Vector2( 0,1 ),
        new THREE.Vector2( 0, 0+offsetY ),
        new THREE.Vector2( 1, 0+offsetY),
        new THREE.Vector2( 1, 1 )
      ]
      this.reflection.geometry.uvsNeedUpdate = true;
    }.bind(this)})


  },

  hide: function( hideCompletely, callback ){

    if( !callback ) callback = {};

    var h = settings.data.arenaWidth/16*9;

    if( this.cubePosition == Player.CubeStateHidden ) return;

    this.cubePosition = hideCompletely?Player.CubeStateHidden:Player.CubeStateIdle;

    this.idlePlane.visible = true;

    TweenMax.to( this.cube.position, 1, {y: -h*.5 + (hideCompletely?5:settings.data.arenaSideHeight) })

    TweenMax.to( this.reflection.scale, 1,{y: (hideCompletely?-0.01:-0.2) , onUpdate: function(){
      var offsetY = this.reflection.scale.y+1;
      this.reflection.geometry.faceVertexUvs[0][0] = [
        new THREE.Vector2( 0,1 ),
        new THREE.Vector2( 0, 0+offsetY ),
        new THREE.Vector2( 1, 0+offsetY),
        new THREE.Vector2( 1, 1 )
      ]
      this.reflection.geometry.uvsNeedUpdate = true;
    }.bind(this)})

  },

  update: function(paddle,alpha){
    var w = settings.data.arenaWidth
      , h = settings.data.arenaHeight
      , hw = w*.5
      , hh = h*.5

    // paddle position
    if (paddle) {
      var x = paddle.current[0]-hw
        , y = paddle.current[1]-hh
        , d = (paddle.aabb[2] - paddle.aabb[0]);

      this.paddle.scale.x = (paddle.aabb[1] - paddle.aabb[3])/100;
      this.paddle.scale.z = (paddle.aabb[2] - paddle.aabb[0])/100;
      this.paddle.position.x = x;
      this.paddle.position.z = y;
    }

    var timeDiff = Date.now() - this.lastTime;
    this.lastTime = Date.now();

    //exploding voxels
    if( this.voxelsExploding.length > 0 ) {
      
     
      var speedIncrementFromGravityEachFrame = this.gravity * timeDiff / 1000;
      var voxel;
      var videoHeight = w/16*9;
      for (var i = this.voxelsExploding.length - 1; i >= 0; i--) {
        voxel = this.voxelsExploding[i];

        voxel.position.add(voxel.velocity)
        voxel.rotation.add(voxel.rotVelocity)

        // floor condition
        if (voxel.position.y < -videoHeight*.5+voxel.radius + settings.data.arenaSideHeight + voxel.radius*voxel.bounceLevel) {

          if( Math.abs(voxel.velocity.y) < 0.005 ) {

            this.voxelsExploding.splice(i,1);
            continue;
          }

          voxel.velocity.y *= -(1 - this.collisionDamper);
        }
        else {
          // gravity
          voxel.velocity.y += speedIncrementFromGravityEachFrame;
        }      
      };
    }

  },

  heal : function(){
   /* var boxesDone = 0; 
    var len = boxes.length;
    for (var i = boxes.length - 1; i >= 0; i--) {
      var box = boxes[i];
      
      TweenMax.to( box.position, 0.3, {delay:i/len*3,y:box.initPosition.y + 50, ease:Sine.easeInOut, onComplete:function(){
         
        TweenMax.to( this.position,  0.4, {x:this.initPosition.x,z:this.initPosition.z, ease:Sine.easeInOut});

        TweenMax.to( this.position,  0.4, {y:this.initPosition.y, ease:Sine.easeInOut, onComplete:function(){
        boxesDone++;
        if( boxesDone == boxes.length ) {
          container.remove( explodedCubeMesh )
          container.add( cubeMesh )
          lockAnimation = false;
        }
        }})

        TweenMax.to( this.rotation, 0.4, { x:0, y:0, z:0, ease:Sine.easeInOut});
        
      }.bind(box)});*/
  },

  wins:function(){

  },

  initVoxels: function(){

    this.voxelsAll = [];
    this.voxelsContainer = new THREE.Object3D();
    this.voxelsContainer.position = this.cube.position;

    var voxel;

    for (var tz = 0; tz < this.voxelsGridSize.z; tz++) {
      for (var tx = 0; tx < this.voxelsGridSize.x; tx++) {
        for (var ty = 0; ty < this.voxelsGridSize.y; ty++) {

          if( tz > 0 && tx > 0 && tx < this.voxelsGridSize.x && ty > 0 && ty < this.voxelsGridSize.y ) {
            
           // break;
          }

          voxel = createVoxel(tx,ty,tz, this.voxelsGridSize)
          voxel.gridPosition = new THREE.Vector3(tx,ty,tz);

          voxel.radius = 360/this.voxelsGridSize.y*.5

          this.voxelsAll.push(voxel);

          this.voxelsContainer.add(voxel);
        }
      }
    }
  },

  explode: function( normalizedHitPosition ) {

    if( !this.voxelsAll ) {
      this.initVoxels();
    }

    var voxel;

    normalizedHitPosition = normalizedHitPosition || 0.5;

    this.arena.remove(this.cube);
    this.arena.add( this.voxelsContainer )

    this.voxelsExploding = this.voxelsAll.concat();

    var voxel;
    for (var i = this.voxelsExploding.length - 1; i >= 0; i--) {
      voxel = this.voxelsExploding[i];
      
      var diffX = normalizedHitPosition-voxel.gridPosition.x/this.voxelsGridSize.x;
      var diffY = voxel.gridPosition.y/this.voxelsGridSize.y-0.5;
      var distanceFactor = Math.sqrt(diffX*diffX + diffY*diffY );
      
     
     voxel.velocity = new THREE.Vector3( 
        (normalizedHitPosition*2-0.5)*4 +  Math.random()*2-1, 
        10+Math.random()*10 + voxel.gridPosition.y/this.voxelsGridSize.y*6, 
        (1-distanceFactor)*-(Math.random()*6+5)  );

      
      voxel.velocity.multiply( new THREE.Vector3(distanceFactor,2-distanceFactor*2,1)  );


      voxel.rotVelocity = new THREE.Vector3( 
        voxel.gridPosition.z*-0.005, 
        distanceFactor*0.002*(distanceFactor>0?1:-1), 
        Math.random()*0.01-0.005 
      );

     // voxel.rotVelocity.multiplyScalar(1-distanceFactor)

      voxel.bounceLevel = Math.floor(Math.random()*3);

    };

  },

  hit : function( normalizedImpactX, callback ){

    this.explode();

    return;

    var uniforms = Materials.opponent.uniforms;

    TweenMax.killDelayedCallsTo(this.breakPixel)
    TweenMax.killTweensOf(this)

    uniforms.time.value = Math.random()*1.4;
    uniforms.noiseAmount.value = 1;


    this.noiseAmount = 0;
    TweenMax.to(this,0.1,{
      noiseAmount:1,
      ease:Sine.easeOut,

      onUpdate:function(){
        uniforms.noiseAmount.value = this.noiseAmount;
      }.bind(this),

      onComplete:function(){

        var totalPixelsDead = 5;
        for (var i =0; i < totalPixelsDead; i++) {
          TweenMax.delayedCall( i*0.05, this.breakPixel, [normalizedImpactX,i/totalPixelsDead*0.8],this )
        };

        TweenMax.to(this,1,{
          noiseAmount:0,
          delay:0.5,
          ease:Elastic.easeIn,
          onUpdate:function(){
            uniforms.noiseAmount.value = this.noiseAmount;
          }.bind(this),
          onComplete:function(){
            if (typeof callback === 'function') {
               callback()
            }
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

    var indexY = totalRows - Math.floor(impactPointY*totalRows);
    var indexX = Math.floor(impactPointX*totalColumns) + Math.floor(Math.random()*indexY)-Math.floor(indexY*.5);

    Materials.opponent.brokenTextureCtx.fillStyle =  "rgba(255, 0, 0, 1)";
    Materials.opponent.brokenTextureCtx.fillRect(gridSizeX*indexX, 512/totalRows*indexY, gridSizeX, gridSizeY);
    Materials.opponent.uniforms.tBroken.value.needsUpdate = true;

  }
}

function createCube(id){
  var w = settings.data.arenaWidth
    , h = w/16*9
    , cubeGeo = new THREE.CubeGeometry(w-20,h,settings.data.videoBoxDepth-10,1,1,1)
    , cubeMesh = new THREE.Mesh(cubeGeo, id==0?Materials.playerACube:Materials.playerBCube);

  cubeMesh.position.y = -h*.5+settings.data.arenaSideHeight;

  return cubeMesh;
}

function createDecal( cube ) {
  //decal
  var w = settings.data.arenaWidth
    , h = w/16*9;

  var decalGeo = new THREE.PlaneGeometry(350,350,1,1);
  var decalMesh = new THREE.Mesh( decalGeo,Materials.decal)
  //decalMesh.material.map.repeat.x = 0.5;
  decalMesh.material.map.repeat.y = 0.5;
  decalMesh.material.map.offset.y = 0.5;
  decalMesh.position.x = 560;
  decalMesh.position.z = -70;
  decalMesh.rotation.x = -Math.PI*.5;
  decalMesh.position.y = h*.5+1

  cube.add(decalMesh);

  return decalMesh;
}

function createIdlePlane(){
   var w = settings.data.arenaWidth
    , h = w/16*9;

  var idlePlane = new THREE.Mesh( new THREE.PlaneGeometry(w-20,h,1,1), Materials.arenaBorder);
  idlePlane.position.z = (settings.data.videoBoxDepth-10)*.5+1;
  idlePlane.visible = true;

  return idlePlane;
}

function createReflectionPlane(renderer,id){
  debug('create reflection plane')

  var w = settings.data.arenaWidth
    , h = w/16*9;

  var planeGeo = new THREE.PlaneGeometry(w-20,h,1,1);
  planeGeo.faceVertexUvs[0][0] = [
    new THREE.Vector2( 0,1 ),
    new THREE.Vector2( 0, 0.8 ),
    new THREE.Vector2( 1, 0.8 ),
    new THREE.Vector2( 1, 1 )
  ]

  planeGeo.uvsNeedUpdate = true;

  planeGeo.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(0, h*.5, 0)));
  var plane = new THREE.Mesh(planeGeo, Materials.opponent);

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
  paddle.position.z = (hh-settings.data.unitSize*2)*(id==0 ? 1 : -1);

  renderer.env.arena.add(paddle);
  return paddle;

}

function createVoxel(indexX,indexY,indexZ, voxelsGridSize ) {

  var w = settings.data.arenaWidth-20
    , h = w/16*9
    , d = settings.data.videoBoxDepth-10

  var voxelSizeX = w/voxelsGridSize.x;
  var voxelSizeY = h/voxelsGridSize.y;
  var voxelSizeZ = d/voxelsGridSize.z;

  var voxelGeo = new THREE.CubeGeometry( voxelSizeX, voxelSizeY, voxelSizeZ, 1, 1, 1 );

  var normSizeX = 1/voxelsGridSize.x;
  var normSizeY = 1/voxelsGridSize.y;

  if( indexZ == 0) {
    //for (var i = voxelGeo.faceVertexUvs[0].length - 1; i >= 0; i--) {

      voxelGeo.faceVertexUvs[0][4] = [
        new THREE.Vector2( normSizeX*indexX ,            1-(normSizeY*indexY)),
        new THREE.Vector2( normSizeX*indexX ,            1-(normSizeY*indexY+normSizeY)),
        new THREE.Vector2( normSizeX*indexX + normSizeX, 1-(normSizeY*indexY+normSizeY)),
        new THREE.Vector2( normSizeX*indexX + normSizeX, 1-(normSizeY*indexY) )
      ]
    //};
  }

  var voxelMesh = new THREE.Mesh(voxelGeo, indexZ==0? Materials.playerACube:Materials.playerACube.materials[0] );
  voxelMesh.position.set( voxelSizeX*indexX-w*.5 + voxelSizeX*.5, h*.5-voxelSizeY*indexY - voxelSizeY*.5 ,d*.5 - indexZ*voxelSizeZ- voxelSizeZ*.5);
  voxelMesh.initPosition = voxelMesh.position.clone();
  return voxelMesh;
  
}


