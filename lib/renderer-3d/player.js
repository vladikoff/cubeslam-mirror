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
  this.reflection = createReflectionPlane(renderer,id);
  this.shield = createShield(renderer,this.columns)
  this.paddle = createPaddle(renderer,id)
  this.reset()

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

    // reset shield position
    this.shield.scale.y = 1
    this.shield.position.z = this.id == 0
      ? -hd+10  // a
      : +hd-10; // b

    // reset paddle position
    this.paddle.position.x = 0;

    this.hide();
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

  update: function(player,paddle){
    var fw = settings.data.arenaWidth
      , fh = settings.data.arenaHeight
      , hw = fw/2
      , hh = fh/2;

    // paddle position
    if (paddle) {
      var x = paddle.x
        , y = paddle.y;
      this.paddle.position.x = (x*fw-hw);
      this.paddle.position.z = (y*fh-hh);
      this.paddle.scale.x = (paddle.width*fw)/100;
    }

    var uniforms = this.shield.material.uniforms;

    // shield brightness
    if( uniforms.uBrightness.value > 0.15 )
      uniforms.uBrightness.value *= 0.97;

    // shield hits
    for(var i=0; i < this.columns.length; i++)
      this.columns[i] = 0;
    for(var i=0; i < player.hits.length; i++ ){
      var c = Math.floor(player.hits[i]*this.columns.length);
      this.columns[c] = 1;
    }
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

  var shieldGeo = new THREE.CubeGeometry(settings.data.arenaWidth,settings.data.arenaSideHeight,8,1,1,1,null, { px: false, nx: false, py: true, ny: false, pz: this.id==0?false:true, nz: this.id==0?true:false })
  shieldGeo.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(0, settings.data.arenaSideHeight*.5, 0)));
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

  var decalGeo = new THREE.PlaneGeometry(350,350,1,1);
  var decalMesh = new THREE.Mesh( decalGeo,renderer.materials.decal)
  decalMesh.material.map.repeat.x = 0.5;
  decalMesh.position.x = 470;
  decalMesh.position.z = -70;
  //decalMesh.material.map.offset.x = 0.5*((id==0)?0:1);

   if( id >= 1) {

    decalGeo.faceVertexUvs[0][0] = [
      new THREE.UV( 1.0,1 ),
      new THREE.UV( 1.0, 0 ),
      new THREE.UV( 2.0, 0 ),
      new THREE.UV( 2.0, 1 )
    ]

    decalGeo.uvsNeedUpdate = true;
  }

  decalMesh.rotation.x = -Math.PI*.5;
  decalMesh.position.y = h*.5+1
  cube.add(decalMesh);

  renderer.env.arena.add(cube);
  return cube;
}

function createReflectionPlane(renderer,id){
  debug('create reflection plane')

  var w = settings.data.arenaWidth
    , h = w/16*9;

  var planeGeo = new THREE.PlaneGeometry(w-20,h,1,1);
  planeGeo.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(0, h*.5, 0)));
  var plane = new THREE.Mesh(planeGeo, id==0?renderer.materials.playerACube[4]:renderer.materials.playerBCube[4]);
  plane.rotation.y = Math.PI*(id==0?1:0);
  plane.opacity=0.3;

  var gradientPlaneGeo = new THREE.PlaneGeometry(w-20,h+40,1,1);
  gradientPlaneGeo.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(0, h*.5, 0)));
  var gradientPlane = new THREE.Mesh(gradientPlaneGeo, renderer.materials.gradientPlane);

  gradientPlane.position.set(0,-h-20,settings.data.arenaHeight*-.5+7)

  renderer.env.arena.add(gradientPlane);
  renderer.env.arena.add(plane);

  return plane;
}

function createPaddle(renderer, id){
  debug('create paddle')
  var paddleGeo = new THREE.CubeGeometry( 100, 60, settings.data.paddleDepth )
    , paddleMat = new THREE.MeshLambertMaterial({shading: THREE.FlatShading, color: id === 0 ? 0xff0000 : 0x0000ff})
    , paddle = new THREE.Mesh( paddleGeo, paddleMat );
  renderer.env.arena.add(paddle);
  return paddle;

}

