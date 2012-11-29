var settings = require('../settings')
  , shaders = require('../shaders')
  , debug = require('debug')('renderer:3d:player')

module.exports = Player;

// Player()
//   - cube (VideoCube/Cube)
//   - paddle
//   - shield
//   #update(player)

function Player(renderer,id){
  debug('new')
  this.id = id;

  this.columns = new Array(settings.data.arenaColumns)
  this.cube = createCube(renderer,id);
  this.pip = createPip(renderer,this.cube,id);
  this.reflection = createReflectionPlane(renderer,id);
  this.shield = createShield(renderer,this.columns)
  this.paddle = createPaddle(renderer,id)
  this.reset()

  this.cameraOffset = new THREE.Vector3(0,0,0);

  this.cameraPlayPosition = {
    origin:{
      x: 0,
      y: settings.data.arenaSurfaceY+settings.data.arenaSideHeight*2+300,
      z: id == 0
      ? this.cube.position.z + 800 // a
      : this.cube.position.z - 800 // b
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
        ? -2500
        : 2500,
      y: 300,
      z: id == 0
        ? 2000 // a
        : -2000 // b
    },
    target:{
        x: id == 0
        ? -2000
        : 2000,
      y: 100,
      z: id == 0
        ? 600 // a
        : -600 // b
    }
  };

   this.cameraWaitingPosition = {
    origin:{
      x: id == 0
        ? -2500
        : 2500,
      y: 600,
      z: id == 0
        ? 0 // a
        : 0 // b
    },
    target:{
        x: id == 0
        ? 0
        : 0,
      y: -300,
      z: id == 0
        ? 0 // a
        : -0 // b
    }
  };

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

    // reset cube position
    this.cube.position.x = 0
    this.cube.position.y = -hh
    this.cube.position.z = this.id == 0
      ? +hd + settings.data.videoBoxDepth*.5 + 2 // a
      : -hd - settings.data.videoBoxDepth*.5 - 2 // b

    this.reflection.scale.y = -1;
    this.reflection.position.z = this.id == 0
      ? +hd-5 // a
      : -hd+5;  // b

    this.reflection.mask.position.z = this.id == 0
      ? +hd-7 // a
      : -hd+7;  // b

    // reset shield position
    this.shield.scale.y = 1
    this.shield.position.z = this.id == 0
      ? -hd+10  // a
      : +hd-10; // b

    // reset paddle position
    this.paddle.position.x = 0;

  },

  show: function(){
     new TWEEN.Tween(this.cube.position)
      .to({y: settings.data.arenaWidth/16*9*.5 },1000)
      .start();

      var refl = this.reflection;
      new TWEEN.Tween(this.reflection.scale)
      .to({y: -1 },1000)
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

      //console.log("show")

  },

  hide: function( hideCompletely ){
    new TWEEN.Tween(this.cube.position)
      .to({y: -settings.data.arenaWidth/16*9*.5 + (hideCompletely?5:settings.data.arenaSideHeight)},1000)
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

  togglePiP : function( show ) {
    this.pip.visible = show;
  },

  update: function(player,paddle){
    // paddle position
    if (paddle) {
      var x = paddle.current[0]
        , y = paddle.current[1]
        , w = paddle.aabb[1] - paddle.aabb[3];
      this.paddle.position.x = x;
      this.paddle.position.z = y+(settings.data.paddleDepth/2+8)*(this.id ? 1 : -1);
      this.paddle.scale.x = w/100;
    }

    var uniforms = this.shield.material.uniforms;

    // shield brightness
    if( uniforms.uBrightness.value > 0.25 )
      uniforms.uBrightness.value *= 0.97;

    // shield hits
    // for(var i=0; i < this.columns.length; i++)
    //   this.columns[i] = 0;
    // for(var i=0; i < player.hits.length; i++ ){
    //   var c = Math.floor(player.hits[i]*this.columns.length);
    //   this.columns[c] = 1;
    // }
  },

  resetShield : function(){
    var scope = this;
    new TWEEN.Tween(this.shield.scale)
      .to({y:0},300)
      .onComplete( function(){

         new TWEEN.Tween(scope.shield.scale)
          .to({y:1},500)
          .start();

      }).start();

  }

}

function createShield(renderer,columns){
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
      uColor: { type: "c", value: new THREE.Color( settings.data.shieldColor ) }
    },
    vertexShader: shaders.simple_vs,
    fragmentShader: shaders.shield_fs
  })

  var shieldMesh = new THREE.Mesh(shieldGeo, shieldMat)
  shieldMesh.name = 'shield'
  shieldMesh.rotation.y = Math.PI*(this.id == 1?1:0);
  renderer.env.arena.add(shieldMesh);
  return shieldMesh;
}

function createCube(renderer,id){
  debug('create cube')

  var w = settings.data.arenaWidth
    , h = w/16*9;

  var cubeGeo = new THREE.CubeGeometry(w-20,h,settings.data.videoBoxDepth-10,1,1,1,id==0?renderer.materials.playerACube:renderer.materials.playerBCube)
    , cubeMat = new THREE.MeshFaceMaterial()
    , cube = new THREE.Mesh(cubeGeo, cubeMat);

  //decal
  var decalGeo = new THREE.PlaneGeometry(350,350,1,1);
  var decalMesh = new THREE.Mesh( decalGeo,renderer.materials.decal)
  decalMesh.material.map.repeat.x = 0.5;
  decalMesh.position.x = 470;
  decalMesh.position.z = -70;
  decalMesh.rotation.x = -Math.PI*.5;
  decalMesh.position.y = h*.5+1

  if( id >= 1) {
    decalGeo.faceVertexUvs[0][0] = [
      new THREE.UV( 1.0,1 ),
      new THREE.UV( 1.0, 0 ),
      new THREE.UV( 2.0, 0 ),
      new THREE.UV( 2.0, 1 )
    ]
    decalGeo.uvsNeedUpdate = true;
  }

  cube.add(decalMesh);
  cube.name = 'cube'+id
  renderer.env.arena.add(cube);

  return cube;
}

function createPip(renderer,cube,id){

  var w = settings.data.arenaWidth
    , h = w/16*9;


  //picture in picture
  var pipGeo = new THREE.PlaneGeometry(w-20,h,1,1);
  var pipMesh = new THREE.Mesh( pipGeo,renderer.materials.remoteVideo)
  pipMesh.scale.set(0.3,0.3,0.3)
  pipMesh.position.set(420, h*.25, settings.data.videoBoxDepth*.5+5);
  pipMesh.visible = false;
  cube.add(pipMesh);

  return pipMesh;
}

function createReflectionPlane(renderer,id){
  debug('create reflection plane')

  var w = settings.data.arenaWidth
    , h = w/16*9;

  var planeGeo = new THREE.PlaneGeometry(w-20,h,1,1);
  planeGeo.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(0, h*.5, 0)));
  var plane = new THREE.Mesh(planeGeo, id==0?renderer.materials.playerACube[4]:renderer.materials.playerBCube[4]);
  plane.name = 'plane'+id
  plane.rotation.y = Math.PI*(id==0?1:0);
  plane.opacity=0.3;

  var gradientPlaneGeo = new THREE.PlaneGeometry(w-20,h+40,1,1);
  gradientPlaneGeo.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(0, h*.5, 0)));
  var gradientPlane = new THREE.Mesh(gradientPlaneGeo, renderer.materials.gradientPlane);
  gradientPlane.name = 'gradientPlane'
  gradientPlane.position.set(0,-h-20,settings.data.arenaHeight*-.5+7)
  renderer.env.arena.add(gradientPlane);
  renderer.env.arena.add(plane);

  plane.mask = gradientPlane;

  return plane;
}

function createPaddle(renderer, id){
  debug('create paddle')
  var paddleGeo = new THREE.CubeGeometry( 100, 60, settings.data.paddleDepth )
    //, paddleMat = new THREE.MeshLambertMaterial({shading: THREE.FlatShading, color: id === 0 ? 0xff0000 : 0x0000ff})
    , paddleMat = new THREE.MeshLambertMaterial({shading: THREE.FlatShading, color: 0xffffff})
    , paddle = new THREE.Mesh( paddleGeo, paddleMat );
  paddle.name = 'paddle'+id
  renderer.env.arena.add(paddle);
  return paddle;

}

