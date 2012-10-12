
module.exports = Renderer;

function Renderer(canvas,bounds){
  this.canvas = canvas;
  this.bounds = bounds;
  this.pointMasses = [];
  this.forces = [];
  this.create();
}

var tableBB = {
  surfaceY:-50,
  xmin: -320,
  xmax: 320,
  ymin: -240,
  ymax: 240,
  zmin:-320,
  zmax:520,
}

var ball = {
  x:0,
  z:0,
  y:tableBB.surfaceY,
  velX:4,
  velZ:8,
  velY:0,
  radius:15
}


Renderer.prototype = {

  create: function(){
    var camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 100, 4000 );
    camera.position.z = tableBB.zmax+200;
    camera.position.y = 30;
    camera.lookAt( new THREE.Vector3(0,0,0) );

    var scene = new THREE.Scene();

    var gameContainer = new THREE.Object3D();
    scene.add(gameContainer);

    var renderer = new THREE.WebGLRenderer({canvas: this.canvas});
    renderer.sortElements = false;
    renderer.setSize( window.innerWidth, window.innerHeight );
    window.addEventListener( 'resize', function(){
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize( window.innerWidth, window.innerHeight );
    }, false );

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.gameContainer = gameContainer;

    this.createBall(15);
    this.createPaddles(150,30);
    this.createLights();
    this.createArena();
  },

  createBall: function(radius){
    var ballGeo = new THREE.CubeGeometry( radius*2, radius*2, radius*2 )
      , ballMat = new THREE.MeshPhongMaterial( { color: 0xffffff })
      , ballMesh = new THREE.Mesh( ballGeo, ballMat );
    ballMesh.position.y = tableBB.surfaceY;
    this.gameContainer.add(ballMesh);

    var ballGuideXGeo = new THREE.PlaneGeometry(tableBB.xmax-tableBB.xmin,5)
      , ballGuideXMat = new THREE.MeshPhongMaterial({color:0xffffff,wireframe:false,opacity:0.4,transparent:false,side:THREE.DoubleSide})
      , ballGuideX = new THREE.Mesh( ballGuideXGeo, ballGuideXMat);
    ballGuideX.rotation.x = -Math.PI*.5;
    ballGuideX.position.y = tableBB.surfaceY-radius-12;
    this.gameContainer.add(ballGuideX);

    var ballGuideYGeo = new THREE.PlaneGeometry(5,tableBB.zmax-tableBB.zmin)
      , ballGuideYMat = new THREE.MeshPhongMaterial({color:0xffffff,wireframe:false,opacity:0.4,transparent:false,side:THREE.DoubleSide})
      , ballGuideY = new THREE.Mesh( ballGuideYGeo, ballGuideYMat );
    ballGuideY.rotation.x = -Math.PI*.5;
    ballGuideY.position.y = tableBB.surfaceY-radius-12;
    this.gameContainer.add(ballGuideY);

    this.ballMesh = ballMesh;
    this.ballGuideX = ballGuideX;
    this.ballGuideY = ballGuideY;
  },

  createPaddles: function(width, height){
    var userPaddleGeo = new THREE.CubeGeometry( width, height, 3 )
      , userPaddleMat = new THREE.MeshPhongMaterial( { color:0xffffff, transparent:false })
      , userPaddle = new THREE.Mesh( userPaddleGeo, userPaddleMat );
    userPaddle.position.z = tableBB.zmax - userPaddle.marginZ;
    userPaddle.position.y = tableBB.surfaceY;
    this.gameContainer.add(userPaddle);

    var opponentPaddleGeo = new THREE.CubeGeometry( width, height, 3 )
      , opponentPaddleMat = new THREE.MeshPhongMaterial( { color:0xffffff, transparent:false })
      , opponentPaddle = new THREE.Mesh( opponentPaddleGeo, opponentPaddleMat );
    opponentPaddle.position.z = tableBB.zmin;
    opponentPaddle.position.y = tableBB.surfaceY;
    this.gameContainer.add(opponentPaddle);

    this.userPaddle = userPaddle;
    this.opponentPaddle = opponentPaddle;
  },

  createLights: function(){
    var spotLight = new THREE.SpotLight( 0xFFFFFF );
    spotLight.intensity = 1;
    spotLight.position.set( 0, 300, 0 );
    this.gameContainer.add(spotLight);

    var pointLight = new THREE.PointLight( 0xFFFFFF );
    pointLight.intensity = 1;
    pointLight.position.set( 0, 0, tableBB.zmax+150 );
    this.gameContainer.add(pointLight);

    var dirLight = new THREE.DirectionalLight( 0xFFFFFF );
    dirLight.position.set( -200, -200, 0 );
    dirLight.lookAt(this.gameContainer.position);
    this.gameContainer.add(dirLight);
  },

  createArena: function(){
    var arenaGeo = new THREE.CubeGeometry(tableBB.xmax-tableBB.xmin,tableBB.ymax-tableBB.ymin,(tableBB.zmax-tableBB.zmin)*1.5)
      , arenaMat = new THREE.MeshPhongMaterial({wireframe:false, color:0xeeeeee, side: THREE.DoubleSide})
      , arena = new THREE.Mesh( arenaGeo, arenaMat );
    this.gameContainer.add(arena);

    var tableGeo = new THREE.PlaneGeometry(tableBB.xmax-tableBB.xmin,tableBB.zmax-tableBB.zmin + 200,10,10)
      , tableMat = new THREE.MeshPhongMaterial({color:0xff0000, opacity:0.2,transparent:true})
      , table = new THREE.Mesh( tableGeo, tableMat );
    table.rotation.x = -Math.PI*.5
    table.position.y = tableBB.surfaceY-ball.radius - 5;
    this.gameContainer.add(table);
  },

  render: function(alpha){
    // TODO Update ball/paddles
    var puck = this.pointMasses[0];
    this.ballMesh.position.set(puck.current.x,this.ballMesh.position.y,puck.current.y)


    this.renderer.render( this.scene, this.camera );
  }


}