var debug = require('debug')('renderer:3d:player')
  , settings = require('../settings')
  , dmaf = require('../dmaf.min')
  , shaders = require('./shaders')
  , EffectSkins = require('./effect-skins')
  , Materials = require('./materials');

module.exports = Player;

// Player()
//   - cube (VideoCube/Cube)
//   - paddle
//   - shields
//   #update(player)

Player.CubeStateIdle = 'idle';
Player.CubeStateHidden = 'hidden';
Player.CubeStateUp = 'up';

function Player(renderer,id){

  debug('new')
  this.time = 0;
  this.id = id;
  this.renderer = renderer;
  this.arena = renderer.env.arena;
  this.mirrored = false;
  this.isHealed = true;
  this.idlePlane = createIdlePlane();
  this.cube = createCube(id);
  this.arena.add(this.cube)
  this.decal = createDecal(this.cube, id);
  this.screenDecal = createScreenDecal(this.cube, id );
  this.cubePosition = Player.CubeStateIdle;
  this.paddleExtraSize = 1;

  this.cube.add(this.idlePlane)

  //exploding voxels
  this.voxelsGridSize = ( settings.data.quality === settings.QUALITY_MOBILE )?new THREE.Vector3( 6, 3, 3  ):new THREE.Vector3( 9, 5, 4  );
  this.voxelsExploding = [];
  this.voxelsDoneAnimating = 0;
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

  this.showReflections = ( settings.data.quality !== settings.QUALITY_MOBILE )

  if( !this.showReflections){
    this.reflection.visible = false;
    this.reflectionIdle.visible = false;
  }


  this.paddle = createPaddle(renderer,id)

  this.reset()

  this.setDecal( this.id ,false);

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

    this.mirrored = mirrored;

    if( mirrored ) {
      this.cube.position.z = -hd - settings.data.videoBoxDepth*0.5 +5;
      this.cube.rotation.y = 0
      this.voxelsContainer.rotation.y = 0;
      this.reflection.position.z = -hd+5
      this.reflectionIdle.position.z = -hd+5
      this.reflection.rotation.y = Math.PI;

    }
    else {
      this.cube.position.z = +hd + settings.data.videoBoxDepth*0.5 -5;
      this.cube.rotation.y = Math.PI
      this.voxelsContainer.rotation.y = Math.PI;
      this.reflection.position.z = +hd-5
      this.reflectionIdle.position.z = +hd-5
      this.reflection.rotation.y = 0;
    }
  },

  setDecal: function( id, multiplayer ) {
     //set decal uv
    var decalGeo = this.decal.geometry;

    if( id === 0) {
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

    this.screenDecal.material.map.offset.set( (id===0)?0:0.5, (multiplayer)?0:0.5 );
  },

  gotoIdleState: function() {
    if( this.cubePosition != Player.CubeStateIdle) {
      this.idlePlane.visible = true;
      this.show(true,function(){} )
    }
  },

  show: function( toIdle ){

    var h = settings.data.arenaWidth/16*9;

    if( this.cubePosition == Player.CubeStateUp && !toIdle ) {
      return
    }

    this.cubePosition = toIdle?Player.CubeStateIdle:Player.CubeStateUp;

    this.idlePlane.visible = this.reflectionIdle.visible = (!this.showReflections)? false : (toIdle?true:false);
    this.reflection.visible = (!this.showReflections)? false: (toIdle)?false:true;

    TweenMax.to( this.cube.position, 3, {ease:Sine.easeOut,y: toIdle?-h*0.5+settings.data.arenaSideHeight:h*0.5 });
    var tweenObj = {y:this.reflection.scale.y}
    TweenMax.to( tweenObj, 3,{ease:Sine.easeOut,y: toIdle?-0.2:-1 , onUpdate: function(){
      var offsetY = tweenObj.y+1;
      this.reflection.geometry.faceVertexUvs[0][0] = [
        new THREE.Vector2( 0,1 ),
        new THREE.Vector2( 0, 0+offsetY ),
        new THREE.Vector2( 1, 0+offsetY),
        new THREE.Vector2( 1, 1 )
      ]
      this.reflection.geometry.uvsNeedUpdate = true;
    }.bind(this)})


    TweenMax.to( this.decal.material,1,{opacity:toIdle?1:0})
    TweenMax.to( this.screenDecal.material,1,{opacity:1})

  },

  hide: function( hideCompletely, callback ){

    if( !callback ) {
      callback = {};
    }

    var h = settings.data.arenaWidth/16*9;

    if( this.cubePosition == Player.CubeStateHidden ) {
      return;
    }

    this.cubePosition = hideCompletely?Player.CubeStateHidden:Player.CubeStateIdle;

    this.idlePlane.visible = this.reflectionIdle.visible = this.showReflections;
    this.reflection.visible = false;

    TweenMax.to( this.cube.position, 1, {y: -h*0.5 + (hideCompletely?5:settings.data.arenaSideHeight) })

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

    TweenMax.to(this.decal.material,1,{opacity:hideCompletely?1:0})
    TweenMax.to(this.screenDecal.material,1,{opacity:0})

  },

  updatePaddle: function(paddle) {
    var hw = settings.data.arenaWidth*0.5
      , hh = settings.data.arenaHeight*0.5;

    // paddle position
    if (paddle) {
      if( !this.resizeSkin.isActive ) {
        this.paddle.scale.x += (((paddle.aabb[1] - paddle.aabb[3])/100)-this.paddle.scale.x)*0.2;
      }
      //else this.paddle.toScale = (paddle.aabb[1] - paddle.aabb[3])/100;
      this.paddle.position.x = paddle.current[0]-hw;
      this.paddle.position.z = paddle.current[1]-hh;
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
      }
    }

  },

  heal : function(){
    this.voxelsDoneAnimating = 0;
    var scope = this;

    if( this.isHealed ) {
      return;
    }

    var len = this.voxelsAll.length;

    this.isInTransition = true;
    this.isHealed = true;

    dmaf.tell('opponent_screen_heal_start');

    for (var i = len - 1; i >= 0; i--) {
      var voxel = this.voxelsAll[i];
      TweenMax.to( voxel.position, 0.3, {delay:i/len*3,y:voxel.initPosition.y + 50, ease:Sine.easeInOut, onComplete:this.onHealVoxelComplete1.bind(null,scope,voxel)});
    }
  },

  onHealVoxelComplete1: function(scope,voxel){
    TweenMax.to( voxel.position,  0.4, {x:voxel.initPosition.x,z:voxel.initPosition.z, ease:Sine.easeInOut});
    TweenMax.to( voxel.position,  0.41, {y:voxel.initPosition.y, ease:Sine.easeInOut, onComplete:scope.onHealVoxelComplete2.bind(null,scope,voxel)});
    TweenMax.to( voxel.rotation, 0.4, { x:0, y:0, z:0, ease:Sine.easeInOut});
  },

  onHealVoxelComplete2: function(scope,voxel){
    scope.voxelsDoneAnimating++;
    dmaf.tell('opponent_screen_heal_voxel');

    if( scope.voxelsDoneAnimating === scope.voxelsAll.length ) {
      scope.arena.add(scope.cube);
      scope.arena.remove(scope.voxelsContainer);
      scope.isInTransition = false;
    }
  },

  wins:function(){

  },

  resizePaddle:function( data ){
    var skin = this.resizeSkin.attachToMesh(this.paddle)

    var toScaleX = data.width/100;
    skin.scale.x = this.paddle.scale.x;

    TweenMax.to(skin.scale,1,{x:toScaleX,ease:Back.easeOut,onComplete:function(){
      dmaf.tell( ((this.id===0)?'user':'opponent') + '_paddle_'  + ((toScaleX > this.paddle.scale.x)?'grow':'shrink'));
      this.resizeSkin.detach()
    }.bind(this)})

  },

  initVoxels: function(){

      var w = settings.data.arenaWidth-20
    , h = w/16*9
    , d = settings.data.videoBoxDepth-10

    this.voxelsAll = [];
    this.voxelsContainer.position = this.cube.position;

    var voxelSizeX = w/this.voxelsGridSize.x;
    var voxelSizeY = h/this.voxelsGridSize.y;
    var voxelSizeZ = d/this.voxelsGridSize.z;

    var voxelGeo = new THREE.CubeGeometry( voxelSizeX, voxelSizeY, voxelSizeZ, 1, 1, 1 );

    var voxelFrontVideoGeo = new THREE.BoxGeometry(voxelSizeX, voxelSizeY, voxelSizeZ,1,1,1, { px: false, nx: false, py: false, ny: false, pz: true, nz: false });
    var voxelFrontBoxGeo = new THREE.BoxGeometry(voxelSizeX, voxelSizeY, voxelSizeZ,1,1,1, { px: true, nx: true, py: true, ny: true, pz: false, nz: true });

    var voxel;

    for (var tz = 0; tz < this.voxelsGridSize.z; tz++) {
      for (var tx = 0; tx < this.voxelsGridSize.x; tx++) {
        for (var ty = 0; ty < this.voxelsGridSize.y; ty++) {

          if( tz > 0 && tx > 0 && tx < this.voxelsGridSize.x-1 && ty > 0 && ty < this.voxelsGridSize.y-1 ) {
            break;
          }

          var normSizeX = 1/this.voxelsGridSize.x;
          var normSizeY = 1/this.voxelsGridSize.y;

          if( tz===0 ) {
            //video layer
            var voxelFrontVideoGeoClone = voxelFrontVideoGeo.clone();

            voxelFrontVideoGeoClone.faceVertexUvs[0][0] = [
              new THREE.Vector2( normSizeX*tx ,            1-(normSizeY*ty)),
              new THREE.Vector2( normSizeX*tx ,            1-(normSizeY*ty+normSizeY)),
              new THREE.Vector2( normSizeX*tx + normSizeX, 1-(normSizeY*ty+normSizeY)),
              new THREE.Vector2( normSizeX*tx + normSizeX, 1-(normSizeY*ty) )
            ]

            voxel = new THREE.Object3D();
            voxel.add(new THREE.Mesh(voxelFrontVideoGeoClone, Materials.playerBCube ));
            voxel.add(new THREE.Mesh(voxelFrontBoxGeo, Materials.playerBCube.materials[0] ));

          } else {
            //regular wall
            voxel = new THREE.Mesh(voxelGeo, Materials.playerBCube.materials[0] );
          }


          voxel.velocity = new THREE.Vector3(0,0,0);
          voxel.rotVelocity = new THREE.Vector3(0,0,0);
          voxel.position.set( voxelSizeX*tx-w*0.5 + voxelSizeX*0.5, h*0.5-voxelSizeY*ty - voxelSizeY*0.5 ,d*0.5 - tz*voxelSizeZ- voxelSizeZ*0.5);
          voxel.initPosition = voxel.position.clone();

          voxel.gridPosition = new THREE.Vector3(tx,ty,tz);

          voxel.radius = settings.data.arenaWidth/16*9 / this.voxelsGridSize.y*0.5

          this.voxelsAll.push(voxel);

          this.voxelsContainer.add(voxel);
        }
      }
    }
  },

  explode: function( normalizedHitPosition ) {

    var w = settings.data.arenaWidth
      , videoHeight = w/16*9;

    if( !this.mirrored ) {
      normalizedHitPosition = 1-normalizedHitPosition;
    }

    if( !this.voxelsAll ) {
      this.initVoxels();
    }

    this.isInTransition = true;

    dmaf.tell('opponent_screen_explode');

    this.isHealed = false;

    var voxel;

    normalizedHitPosition = normalizedHitPosition || 1;

    this.arena.remove(this.cube);
    this.arena.add( this.voxelsContainer );

    this.voxelsExploding = this.voxelsAll.concat();

    for (var i = this.voxelsExploding.length - 1; i >= 0; i--) {
      voxel = this.voxelsExploding[i];

      var diffX = normalizedHitPosition-voxel.gridPosition.x/this.voxelsGridSize.x;
      var diffY = voxel.gridPosition.y/this.voxelsGridSize.y-0.5;
      var distanceFactor = Math.sqrt(diffX*diffX + diffY*diffY );


      voxel.velocity.set(
        (normalizedHitPosition*2-0.5)*4 +  Math.random()*2-1,
        10+Math.random()*10 + voxel.gridPosition.y/this.voxelsGridSize.y*6,
        (1-distanceFactor)*-(Math.random()*6+10)  );


      voxel.velocity.x *= distanceFactor;
      voxel.velocity.y *= 2-distanceFactor*2;

      voxel.rotVelocity.set(
        voxel.gridPosition.z*-0.005,
        distanceFactor*0.002*(distanceFactor>0?1:-1),
        Math.random()*0.01-0.005
      );

      voxel.bounceLevel = Math.floor(Math.random()*2);
      voxel.bounceLimit = voxel.velocity.z/-10 *-300;

      voxel.endY = -videoHeight*0.5+voxel.radius + settings.data.arenaSideHeight + voxel.radius*voxel.bounceLevel + voxel.bounceLimit;

    }

  },

  hit : function( normalizedImpactX, callback ){


    if( !this.mirrored ) {
      normalizedImpactX = 1-normalizedImpactX;
    }

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
        }

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

    var gridSizeX = 256/totalColumns;
    var gridSizeY = 256/totalRows;

    var indexY = totalRows - Math.floor(impactPointY*totalRows);
    var indexX = Math.floor(impactPointX*totalColumns) + Math.floor(Math.random()*indexY)-Math.floor(indexY*0.5);

    Materials.opponent.brokenTextureCtx.fillStyle =  'rgb(255, 0, 0)';
    Materials.opponent.brokenTextureCtx.fillRect(gridSizeX*indexX, 256/totalRows*indexY, gridSizeX, gridSizeY);
    Materials.opponent.uniforms.tBroken.value.needsUpdate = true;

  }
}

function createCube(id){
  var w = settings.data.arenaWidth
    , h = w/16*9
    , cubeGeo = new THREE.CubeGeometry(w-20,h,settings.data.videoBoxDepth-10,1,1,1)
    , cubeMesh = new THREE.Mesh(cubeGeo, id===0?Materials.playerACube:Materials.playerBCube);

  cubeMesh.position.y = -h*0.5+settings.data.arenaSideHeight;

  return cubeMesh;
}

function createDecal( cube, id  ) {
  //decal
  var w = settings.data.arenaWidth
    , h = w/16*9;

  var decalGeo = new THREE.PlaneGeometry(350,350,1,1);
  var decalMesh = new THREE.Mesh( decalGeo, id===0?Materials.decal1:Materials.decal2)
  //decalMesh.material.map.repeat.x = 0.5;
  decalMesh.material.map.repeat.y = 0.5;
  decalMesh.material.map.offset.y = 0.5;

  decalMesh.position.x = 610;
  decalMesh.position.z = -100;
  decalMesh.rotation.x = -Math.PI*0.5;
  decalMesh.position.y = h*0.5+1

  cube.add(decalMesh);

  return decalMesh;
}

function createScreenDecal( cube, id ) {
  //decal
  var w = settings.data.arenaWidth
    , hw = w*0.5
    , h = w/16*9
    , d = settings.data.videoBoxDepth-10;

  var decalGeo = new THREE.PlaneGeometry(300,270,1,1);
  var decalMesh = new THREE.Mesh( decalGeo,(id===0)?Materials.screenDecal1:Materials.screenDecal2 )

  decalMesh.material.map.repeat = new THREE.Vector2( 0.5, 0.5 );
  decalMesh.material.map.offset = new THREE.Vector2( 0, 0 );
  decalMesh.position.x = hw - 210;
  decalMesh.position.z = d*0.5+2;

  decalMesh.position.y = h*0.5-175;

  cube.add(decalMesh);

  return decalMesh;
}

function createIdlePlane(){
   var w = settings.data.arenaWidth
    , h = w/16*9;

  var idlePlane = new THREE.Mesh( new THREE.CubeGeometry(w-20,h,7,1,1,1), Materials.arenaBorder);
  idlePlane.position.z = (settings.data.videoBoxDepth-10)*0.5+1;
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

  planeGeo.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(0, h*0.5, 0)));
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
  geo.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(0, -h*0.5, 0)));
  var plane = new THREE.Mesh( geo, Materials.idleReflection);
  renderer.env.arena.add(plane);

  return plane;
}

function createPaddle(renderer, id){
  debug('create paddle')
  var w = settings.data.arenaWidth
    , h = settings.data.arenaHeight
    , hw = w*0.5
    , hh = h*0.5
    , paddleGeo = new THREE.CubeGeometry( 100, settings.data.unitSize*2, settings.data.unitSize )
    , paddle = new THREE.Mesh( paddleGeo, Materials.paddle );

  paddle.name = 'paddle'+id
  paddle.scale.x = settings.data.unitSize*5/100;
  paddle.position.z = (hh-settings.data.unitSize*1.25)*(id===0 ? 1 : -1);

  renderer.env.arena.add(paddle);
  return paddle;

}