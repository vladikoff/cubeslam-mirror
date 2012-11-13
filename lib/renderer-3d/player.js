var settings = require('../settings')
  , shaders = require('../shaders')

module.exports = Player;

// Player()
//   - cube (VideoCube/Cube)
//   - paddle
//   - shield
//   #update(player)

function Player(renderer,id){
  this.active = false;
  this.id = id;

  this.columns = []
  for (var i=0; i < settings.data.arenaColumns; i++)
    this.columns.push(0);

  this.cube = createCube(renderer,id)
  this.shield = createShield(renderer,this.columns)
  this.paddle = createPaddle(renderer)

  this.cameraPosition = {
    x: 0, 
    y: settings.data.arenaSurfaceY+settings.data.arenaSideHeight*2, 
    z: id == 0 ? this.cube.position.z + 500 : -this.cube.position.z - 500
  };

  console.log('created player %s ',id,this.cameraPosition)
}

Player.prototype = {

  reset: function(){
    // TODO
  },

  update: function(player){
    var fw = settings.data.arenaWidth
      , fh = settings.data.arenaHeight
      , hw = fw/2
      , hh = fh/2;

    // paddle position
    var x = player.paddle.r - player.paddle.width/2
      , y = player.paddle.b - player.paddle.height/2;
    this.paddle.position.x = this.id == 1 ? -(x*fw-hw) : (x*fw-hw); // mirrored
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
    for(var i=0; i < this.columns.length; i++)
      uniforms.uColumnValues.value[i] = 0;
    for(var i=0; i < player.hits.length; i++ ){
      var c = Math.floor(player.hits[i]*this.columns.length); // TODO mirrored?
      uniforms.uColumnValues.value[c] = 1;
    }
  }

}


function createShield(renderer,columns){
  var w = settings.data.arenaWidth
    , h = w / 16*9
    , d = settings.data.arenaHeight
    , hd = d/2
    , sideH = settings.data.arenaSideHeight;

  var shieldGeo = new THREE.CubeGeometry(w,sideH,8,1,1,1,null, { px: false, nx: false, py: true, ny: false, pz: true, nz: true })
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
  shieldMesh.position.y = sideH*.5;    
  shieldMesh.position.z = this.id == 0 
    ? hd-3    // a
    : -hd+15; // b
  renderer.env.arena.add(shieldMesh);
  return shieldMesh;
}

function createCube(renderer,id){
  var w = settings.data.arenaWidth
    , h = w/16*9
    , hh = h*0.5
    , d = settings.data.arenaHeight
    , hd = d*.5
    , sideH = settings.data.arenaSideHeight

  var cubeGeo = new THREE.CubeGeometry(w,h,settings.data.videoBoxDepth,1,1,1,renderer.materials.videoCube)
    , cubeMat = new THREE.MeshFaceMaterial()
    , cube = new THREE.Mesh(cubeGeo, cubeMat);
  cube.position.x = 0
  cube.position.y = sideH-hh
  cube.position.z = id == 0
      ? +hd + settings.data.videoBoxDepth*.5 + 2 // a
      : -hd - settings.data.videoBoxDepth*.5 - 1 // b
  renderer.env.arena.add(cube);
  return cube;
}

function createPaddle(renderer){
  var paddleGeo = new THREE.CubeGeometry( 100, 60, settings.data.paddleDepth )
    , paddle = new THREE.Mesh( paddleGeo, renderer.materials.paddle );
  renderer.env.arena.add(paddle);
  return paddle;
}