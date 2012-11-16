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
  this.cube = createCube(renderer,id)
  this.shield = createShield(renderer,this.columns)
  this.paddle = createPaddle(renderer)
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
      y: 500, 
      z: id == 0 
        ? 2000 // a
        : -2000 // b
    },
    target:{
        x: id == 0 
        ? -2000
        : 2000, 
      y: -200, 
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


    // reset shield position
    this.shield.position.y = sideH*.5
    this.shield.position.z = this.id == 0 
      ? -hd  // a
      : +hd; // b

    // reset paddle position
    this.paddle.position.x = 0;

    this.hide();
  },

  show: function(){
     new TWEEN.Tween(this.cube.position)
      .to({y: settings.data.arenaWidth/16*9*.5 },1000)
      .start();

  },

  hide: function( hideCompletely ){
    new TWEEN.Tween(this.cube.position)
      .to({y: -settings.data.arenaWidth/16*9*.5 + (hideCompletely?0:settings.data.arenaSideHeight)},1000)
      .start();
  },

  update: function(player){
    var fw = settings.data.arenaWidth
      , fh = settings.data.arenaHeight
      , hw = fw/2
      , hh = fh/2;

    // paddle position
    var x = player.paddle.r - player.paddle.width/2
      , y = player.paddle.b - player.paddle.height/2;
    this.paddle.position.x = (x*fw-hw);
    this.paddle.position.z = (y*fh-hh);
    this.paddle.scale.x = (player.paddle.width*fw)/100;

    var uniforms = this.shield.material.uniforms;

    // shield color
    if( settings.data.puckColor != uniforms.uColor.value.getHex())
      uniforms.uColor.value.setHex( settings.data.puckColor )

    // shield brightness
    if( uniforms.uBrightness.value > 0.15 ) 
      uniforms.uBrightness.value *= 0.97;

    // shield hits
    // TODO this doesnt work properly
    for(var i=0; i < this.columns.length; i++)
      this.columns[i] = 0;
    for(var i=0; i < player.hits.length; i++ ){
      var c = Math.floor(player.hits[i]*this.columns.length); // TODO mirrored?
      this.columns[c] = 1;
    }
  }

}


function createShield(renderer,columns){
  debug('create shield')

  var shieldGeo = new THREE.CubeGeometry(settings.data.arenaWidth,settings.data.arenaSideHeight,8,1,1,1,null, { px: false, nx: false, py: true, ny: false, pz: true, nz: true })

  // TODO refactor shield material into materials?
  var shieldMat = new THREE.ShaderMaterial({
    blending: THREE.NormalBlending,
    transparent: true,
    uniforms: {
      resolution: { type: "v2", value: new THREE.Vector3(900,300)},
      uColumns: { type:"f", value: columns.length},
      uColumnValues: { type: "fv1", value: columns},
      uBrightness:  { type: "f", value: 1.0 },
      uColor: { type: "c", value: new THREE.Color( settings.data.puckColor ) }
    },
    vertexShader: shaders.simple_vs,
    fragmentShader: shaders.shield_fs
  })

  var shieldMesh = new THREE.Mesh(shieldGeo, shieldMat)
  renderer.env.arena.add(shieldMesh);
  return shieldMesh;
}

function createCube(renderer,id){
  debug('create cube')

  var w = settings.data.arenaWidth
    , h = w/16*9;

  var cubeGeo = new THREE.CubeGeometry(w,h,settings.data.videoBoxDepth,1,1,1,id==0?renderer.materials.playerACube:renderer.materials.playerBCube)
    , cubeMat = new THREE.MeshFaceMaterial()
    , cube = new THREE.Mesh(cubeGeo, cubeMat);
  renderer.env.arena.add(cube);
  return cube;
}

function createPaddle(renderer){
  debug('create paddle')
  var paddleGeo = new THREE.CubeGeometry( 100, 60, settings.data.paddleDepth )
    , paddle = new THREE.Mesh( paddleGeo, renderer.materials.paddle );
  renderer.env.arena.add(paddle);
  return paddle;
}
