
module.exports = Renderer;

function Renderer(canvas,bounds){
  this.canvas = canvas;
  this.bounds = bounds;
  this.pointMasses = [];
  this.forces = [];
  this.forceMeshes = [];
  this.paddles = [];
  this.paddleMeshes = [];
  this.create();
}

Renderer.prototype = {

  invert: function(){
    // rotate this.gameContainer 180 degrees
    this.gameContainer.rotation.y = 0;
  },

  within: function(pt){
    // check if the pt is within the canvas area
    return document.elementFromPoint(pt.x,pt.y) === this.canvas;
  },

  create: function(){
    var camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 100, 4000 );
    camera.position.z = this.bounds.b - this.bounds.t;
    camera.position.y = 30;
    camera.lookAt( new THREE.Vector3(0,0,0) );

    var scene = new THREE.Scene();

    var gameContainer = new THREE.Object3D();
    gameContainer.rotation.y = Math.PI; // 180°
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

    this.surfaceY = -50;

    var radius = 15;
    this.createBall(radius);
    this.createPaddles(radius);
    this.createLights();
    this.createArena(radius);
  },

  createBall: function(radius){
    var ballGeo = new THREE.SphereGeometry( radius )
      , ballMat = new THREE.MeshPhongMaterial( { color: 0xffffff })
      , ballMesh = new THREE.Mesh( ballGeo, ballMat );
    ballMesh.position.y = this.surfaceY;
    this.gameContainer.add(ballMesh);

    var ballGuideXGeo = new THREE.PlaneGeometry(this.bounds.b-this.bounds.t,radius/3)
      , ballGuideXMat = new THREE.MeshPhongMaterial({color:0xffffff,wireframe:false,opacity:0.4,transparent:false,side:THREE.DoubleSide})
      , ballGuideX = new THREE.Mesh( ballGuideXGeo, ballGuideXMat);
    ballGuideX.rotation.x = -Math.PI*.5;
    ballGuideX.position.y = this.surfaceY-radius/2;
    this.gameContainer.add(ballGuideX);

    var ballGuideYGeo = new THREE.PlaneGeometry(radius/3,this.bounds.b-this.bounds.t)
      , ballGuideYMat = new THREE.MeshPhongMaterial({color:0xffffff,wireframe:false,opacity:0.4,transparent:false,side:THREE.DoubleSide})
      , ballGuideY = new THREE.Mesh( ballGuideYGeo, ballGuideYMat );
    ballGuideY.rotation.x = -Math.PI*.5;
    ballGuideY.position.y = this.surfaceY-radius/2;
    this.gameContainer.add(ballGuideY);

    this.ballMesh = ballMesh;
    this.ballGuideX = ballGuideX;
    this.ballGuideY = ballGuideY;
  },

  createPaddles: function(radius){
    var halfDepth = (this.bounds.b-this.bounds.t)/2;

    var userPaddleGeo = new THREE.CubeGeometry( 100, 100, 3 )
      , userPaddleMat = new THREE.MeshPhongMaterial( { color:0xffffff, transparent:false })
      , userPaddle = new THREE.Mesh( userPaddleGeo, userPaddleMat );
    userPaddle.position.z = this.bounds.t-halfDepth+radius;
    userPaddle.position.y = this.surfaceY;
    this.gameContainer.add(userPaddle);

    var opponentPaddleGeo = new THREE.CubeGeometry( 100, 100, 3 )
      , opponentPaddleMat = new THREE.MeshPhongMaterial( { color:0xffffff, transparent:false })
      , opponentPaddle = new THREE.Mesh( opponentPaddleGeo, opponentPaddleMat );
    opponentPaddle.position.z = this.bounds.b-halfDepth+radius;
    opponentPaddle.position.y = this.surfaceY;
    this.gameContainer.add(opponentPaddle);

    this.paddleMeshes.push(userPaddle)
    this.paddleMeshes.push(opponentPaddle)
  },

  createLights: function(){
    var spotLight = new THREE.SpotLight( 0xFFFFFF );
    spotLight.intensity = 1;
    spotLight.position.set( 0, 300, 0 );
    this.gameContainer.add(spotLight);

    var pointLight = new THREE.PointLight( 0xFFFFFF );
    pointLight.intensity = 1;
    pointLight.position.set( 0, 0, this.bounds.b+150 );
    this.gameContainer.add(pointLight);

    var dirLight = new THREE.DirectionalLight( 0xFFFFFF );
    dirLight.position.set( -200, -200, 0 );
    dirLight.lookAt(this.gameContainer.position);
    this.gameContainer.add(dirLight);
  },

  createArena: function(radius){
    var w = this.bounds.r-this.bounds.l+radius*2
      , h = this.bounds.b-this.bounds.t+radius*2
      , d = 1000; // NOTE: adjusting depth requires moving the camera

    var arenaGeo = new THREE.CubeGeometry(w,h,d)
      , arenaMat = new THREE.MeshPhongMaterial({wireframe:false, color:0xeeeeee, side: THREE.DoubleSide})
      , arena = new THREE.Mesh( arenaGeo, arenaMat );
    this.gameContainer.add(arena);

    var tableGeo = new THREE.PlaneGeometry(w,h,10,10)
      , tableMat = new THREE.MeshPhongMaterial({color:0xff0000, opacity:0.2,transparent:true})
      , table = new THREE.Mesh( tableGeo, tableMat );
    table.rotation.x = -Math.PI*.5
    table.position.y = this.surfaceY-radius;
    this.gameContainer.add(table);
  },

  render: function(alpha){
    var hw = (this.bounds.r-this.bounds.l)/2
      , hh = (this.bounds.b-this.bounds.t)/2;

    // Update ball/puck
    var puck = this.pointMasses[0];
    this.ballMesh.position.x = puck.current.x-hw;
    this.ballMesh.position.z = puck.current.y-hh;
    this.ballGuideY.position.x = this.ballMesh.position.x;
    this.ballGuideX.position.z = this.ballMesh.position.z;

    // Render forces
    if( this.forces.length > this.forceMeshes.length ){
      // creates meshes if there's any new forces
      for(var i=this.forceMeshes.length; i < this.forces.length; i++ ){
        var force = this.forces[i]
          , forceGeo = new THREE.SphereGeometry( force.mass )
          , forceMat = new THREE.MeshPhongMaterial({ opacity: 0.1, color: 0x00ff00, transparent:true })
          , forceMesh = new THREE.Mesh( forceGeo, forceMat );
        forceMesh.position.x = force.x-hw;
        forceMesh.position.z = force.y-hh;
        forceMesh.position.y = this.surfaceY;
        this.gameContainer.add(forceMesh);
        this.forceMeshes.push(forceMesh);
      }
    }

    // Update paddles
    for(var i=0; i < this.paddles.length; i++ ){
      var mesh = this.paddleMeshes[i]
        , paddle = this.paddles[i];
      mesh.position.x = paddle.x-hw;
      mesh.position.z = paddle.y-hh;
      mesh.scale.x = paddle.width/100;
      mesh.scale.y = 30/100;
    }

    this.renderer.render( this.scene, this.camera );
  }

}

function lerp(n,c,t){
  return c + (n-c) * t;
}