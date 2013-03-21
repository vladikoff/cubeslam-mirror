var settings = require('../settings')
  , shaders = require('./shaders')
  , debug = require('debug')('renderer:3d:player')
  , ObjectPool = require('./object-pool')
  , EffectSkins = require('./effect-skins')
  , Materials = require('./materials')
  , dmaf = require('../dmaf.min');

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
  this.idlePlane = createIdlePlane();
  this.cube = createCube(id);
  this.arena.add(this.cube)
  this.decal = createDecal(this.cube);
  this.cubePosition = Player.CubeStateIdle;
  this.paddleExtraSize = 1;

  this.cube.add(this.idlePlane)

  //exploding voxels
  this.voxelsGridSize = new THREE.Vector3( 9, 5, 4  );
  this.voxelsExploding = [];
  this.isInTransition = false;
  this.voxelsAll = null;
  this.voxelsContainer = new THREE.Object3D();
  this.gravity = -45.5; // px / second^2
  this.collisionDamper = 0.5; // 20% energy loss
  this.lastTime = Date.now();

  this.resizeSkin = new EffectSkins.resize()

  this.noiseAmount = 0;
  this.videoMaterial = null;

  this.reflection = createReflectionPlane(renderer,id);
  this.reflectionIdle = createReflectionIdlePlane(renderer,id);
  this.paddle = createPaddle(renderer,id)

  this.reset()

  this.setDecal( this.id );

}

Player.prototype = {

  reset: function(){
    debug('reset')
    // reset paddle position

    this.paddle.offsetZ = 0;
    this.heal();

  },

  paddleToCenterUpdate: function(){
    this.paddle.position.x += (0-this.paddle.position.x)/15
  },

  setCubePosition: function( mirrored  ) {
    //position cube
    var d = settings.data.arenaHeight
      , hd = d/2

    if( mirrored ) {
      this.cube.position.z = -hd - settings.data.videoBoxDepth*.5 +5
      this.cube.rotation.y = 0
      this.voxelsContainer.rotation.y = 0;
      this.reflection.position.z = -hd+5
      this.reflectionIdle.position.z = -hd+5
      this.reflection.rotation.y = Math.PI;

    }
    else {
      this.cube.position.z = +hd + settings.data.videoBoxDepth*.5;
      this.cube.rotation.y = Math.PI
      this.voxelsContainer.rotation.y = Math.PI;
      this.reflection.position.z = +hd-5
      this.reflectionIdle.position.z = +hd-5
      this.reflection.rotation.y = 0;
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
      this.idlePlane.visible = true;
      this.show(true,function(){} )
    }
  },

  show: function( toIdle ){

    var h = settings.data.arenaWidth/16*9;

    if( this.cubePosition == Player.CubeStateUp && !toIdle ) return;

    this.cubePosition = toIdle?Player.CubeStateIdle:Player.CubeStateUp;

    this.idlePlane.visible = this.reflectionIdle.visible = (toIdle)?true:false;
    this.reflection.visible = (toIdle)?false:true

    TweenMax.to( this.cube.position, 1, {y: toIdle?-h*.5+settings.data.arenaSideHeight:h*.5 })
    var tweenObj = {y:this.reflection.scale.y}
    TweenMax.to( tweenObj, 1,{y: toIdle?-0.2:-1 , onUpdate: function(){
      var offsetY = tweenObj.y+1;
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

    this.idlePlane.visible = this.reflectionIdle.visible = true;
    this.reflection.visible = false;

    TweenMax.to( this.cube.position, 1, {y: -h*.5 + (hideCompletely?5:settings.data.arenaSideHeight) })

    var tweenObj = {y:this.reflection.scale.y}
    TweenMax.to( tweenObj, 1,{y: (hideCompletely?-0.01:-0.2) , onUpdate: function(){
      var offsetY = tweenObj+1;
      this.reflection.geometry.faceVertexUvs[0][0] = [
        new THREE.Vector2( 0,1 ),
        new THREE.Vector2( 0, 0+offsetY ),
        new THREE.Vector2( 1, 0+offsetY),
        new THREE.Vector2( 1, 1 )
      ]
      this.reflection.geometry.uvsNeedUpdate = true;
    }.bind(this)})

  },

  updatePaddle: function(paddle,alpha) {
    var  hw = settings.data.arenaWidth*.5
      , hh = settings.data.arenaHeight*.5

    // paddle position
    if (paddle) {
      if( !this.resizeSkin.isActive ) this.paddle.scale.x += (((paddle.aabb[1] - paddle.aabb[3])/100)-this.paddle.scale.x)*0.2;
      //else this.paddle.toScale = (paddle.aabb[1] - paddle.aabb[3])/100;
      this.paddle.position.x = paddle.current[0]-hw;
    }

  },

  update: function(alpha){


    var timeDiff = Date.now() - this.lastTime;
    this.lastTime = Date.now();

    //exploding voxels
    if( this.isInTransition ) {

      var speedIncrementFromGravityEachFrame = this.gravity * timeDiff / 1000;
      var voxel;

      var len = this.voxelsExploding.length;

      this.isInTransition = len > 0

      for (var i = len - 1; i >= 0; i--) {
        voxel = this.voxelsExploding[i];

        voxel.position.add(voxel.velocity)
        voxel.rotation.add(voxel.rotVelocity)

        // floor condition
        if (voxel.position.y < voxel.endY) {

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
    var voxelsDone = 0;
    var scope = this;

    if( !this.voxelsAll ) return;

    var len = this.voxelsAll.length;

    this.isInTransition = true;

    for (var i = len - 1; i >= 0; i--) {
      var voxel = this.voxelsAll[i];

      TweenMax.to( voxel.position, 0.3, {delay:i/len*3,y:voxel.initPosition.y + 50, ease:Sine.easeInOut, onComplete:function(){

        TweenMax.to( this.position,  0.4, {x:this.initPosition.x,z:this.initPosition.z, ease:Sine.easeInOut});

        TweenMax.to( this.position,  0.4, {y:this.initPosition.y, ease:Sine.easeInOut, onComplete:function(){
          voxelsDone++;
          if( voxelsDone == scope.voxelsAll.length ) {
            scope.arena.add(scope.cube);
            scope.arena.remove(scope.voxelsContainer);
            scope.isInTransition = false;
          }
        }})

        TweenMax.to( this.rotation, 0.4, { x:0, y:0, z:0, ease:Sine.easeInOut});

      }.bind(voxel)});
    }
  },

  wins:function(){

  },

  resizePaddle:function( data ){
    var skin = this.resizeSkin.attachToMesh(this.paddle)

    //{playerID:playerID,player:player, paddle: paddle
    var toScaleX = (data.paddle.aabb[1] - data.paddle.aabb[3])/100
    skin.scale.x = this.paddle.scale.x;
    TweenMax.to(skin.scale,1,{x:toScaleX,ease:Back.easeOut,onComplete:function(){
      this.resizeSkin.detach()
    }.bind(this)})
    /*TweenMax.to( this,0.2,{paddleExtraSize:1.3,ease:Back.easeInOut,onComplete:function(){
      TweenMax.to( this,0.2,{paddleExtraSize:0.5,ease:Back.easeInOut,onComplete:function(){
        TweenMax.to( this,0.2,{paddleExtraSize:1.1,ease:Back.easeInOut,onComplete:function(){
          TweenMax.to( this,0.2,{paddleExtraSize:1,ease:Back.easeInOut});
        }.bind(this)})
      }.bind(this)})
    }.bind(this)})*/
  },

  initVoxels: function(){

    this.voxelsAll = [];
    this.voxelsContainer.position = this.cube.position;

    var voxel;

    for (var tz = 0; tz < this.voxelsGridSize.z; tz++) {
      for (var tx = 0; tx < this.voxelsGridSize.x; tx++) {
        for (var ty = 0; ty < this.voxelsGridSize.y; ty++) {

          if( tz > 0 && tx > 0 && tx < this.voxelsGridSize.x-1 && ty > 0 && ty < this.voxelsGridSize.y-1 ) {

            break;
          }

          voxel = createVoxel(tx,ty,tz, this.voxelsGridSize)
          voxel.gridPosition = new THREE.Vector3(tx,ty,tz);

          voxel.radius = settings.data.arenaWidth/16*9 / this.voxelsGridSize.y*.5

          this.voxelsAll.push(voxel);

          this.voxelsContainer.add(voxel);
        }
      }
    }
  },

  explode: function( normalizedHitPosition ) {

    var w = settings.data.arenaWidth
      , videoHeight = w/16*9;

    if( !this.voxelsAll ) {
      this.initVoxels();
    }

    this.isInTransition = true;

    dmaf.tell('opponent_screen_explode');

    var voxel;

    normalizedHitPosition = normalizedHitPosition || 1;

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
        (1-distanceFactor)*-(Math.random()*6+10)  );


      voxel.velocity.multiply( new THREE.Vector3(distanceFactor,2-distanceFactor*2,1)  );


      voxel.rotVelocity = new THREE.Vector3(
        voxel.gridPosition.z*-0.005,
        distanceFactor*0.002*(distanceFactor>0?1:-1),
        Math.random()*0.01-0.005
      );

      voxel.bounceLevel = Math.floor(Math.random()*2);
      voxel.bounceLimit = voxel.velocity.z/-10 *-300;

      voxel.endY = -videoHeight*.5+voxel.radius + settings.data.arenaSideHeight + voxel.radius*voxel.bounceLevel + voxel.bounceLimit

    };

  },

  hit : function( normalizedImpactX, callback ){

    // TODO Proper event order for voxel explosion
    //this.explode(normalizedImpactX);

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

        var totalPixelsDead = 15;
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

    var totalColumns = this.voxelsGridSize.x*2;
    var totalRows = this.voxelsGridSize.y*2;

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

  var idlePlane = new THREE.Mesh( new THREE.CubeGeometry(w-20,h,7,1,1,1), Materials.arenaBorder);
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
  plane.visible = false;
  plane.scale.y = -0.8;
  plane.scale.x = -1;

  renderer.env.arena.add(plane);

  return plane;
}

function createReflectionIdlePlane(renderer,id) {
   var w = settings.data.arenaWidth
    , h = w/16*9;

  var geo = new THREE.PlaneGeometry(w-20,h,1,1);
  geo.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(0, -h*.5, 0)));
  var plane = new THREE.Mesh( geo, Materials.idleReflection);
  renderer.env.arena.add(plane);

  return plane;
}

function createPaddle(renderer, id){
  debug('create paddle')
  var w = settings.data.arenaWidth
    , h = settings.data.arenaHeight
    , hw = w*.5
    , hh = h*.5
    , paddleGeo = new THREE.CubeGeometry( 100, settings.data.unitSize*2, settings.data.unitSize )
    , paddle = new THREE.Mesh( paddleGeo, Materials.paddle );

  paddle.name = 'paddle'+id
  paddle.scale.x = settings.data.unitSize*5/100;
  paddle.position.z = (hh-settings.data.unitSize*1.25)*(id==0 ? 1 : -1);

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

  var voxelMesh = new THREE.Mesh(voxelGeo, indexZ==0? Materials.playerBCube:Materials.playerBCube.materials[0] );
  voxelMesh.position.set( voxelSizeX*indexX-w*.5 + voxelSizeX*.5, h*.5-voxelSizeY*indexY - voxelSizeY*.5 ,d*.5 - indexZ*voxelSizeZ- voxelSizeZ*.5);
  voxelMesh.initPosition = voxelMesh.position.clone();
  return voxelMesh;

}


