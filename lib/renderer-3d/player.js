
module.exports = Player;

// Player()
//   - cube (VideoCube/Cube)
//   - paddle
//   - shield
//   #update(player)

function Player(renderer)  {
  this.cubeUpY = 0;
  this.cubeDownY = 0;

  this.columns = []
  for (var i=0; i < settings.data.arenaColumns; i++)
    this.columns.push(0);

  this.cube = createCube(renderer)
  this.shield = createShield(renderer,this.columns)
  this.paddle = createPaddle(renderer)
}

Player.prototype = {

  update: function(player){

    // paddle position

    // shield color

    // shield brightness

    // shield hits

  }

}


function createShield(renderer,columns){
  var w = settings.data.arenaWidth
    , h = w / 16*9
    , d = settings.data.arenaHeight
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
    vertexShader: renderer.shaders.simple_vs,
    fragmentShader: renderer.shaders.shield_fs
  })

  var shieldMesh = new THREE.Mesh(shieldGeo, shieldMat)
  shieldMesh.position.y = sideH*.5;    
  shieldMesh.position.z = hd-3;       // a
  // shieldMesh.position.z = -hd+15;  // b
  renderer.container.add(shieldMesh);
  return shieldMesh;
}

function createCube(renderer){

}

function createPaddle(renderer){
  var paddleGeo = new THREE.CubeGeometry( 100, 60, settings.data.paddleDepth )
    , paddle = new THREE.Mesh( paddleGeo, renderer.materials.paddle );
  renderer.container.add(paddle);
  return paddle;
}