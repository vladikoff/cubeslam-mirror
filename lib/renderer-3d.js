var settings = require('./settings');

module.exports = Renderer;

function Renderer(canvas,bounds){
  this.canvas = canvas;
  this.bounds = bounds;
  this.pointMasses = [];
  this.ballMeshes = [];
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

  create: function(){

    var camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 10, 14000 );
    camera.position.z = 1200;

    camera.position.y = 30;
    camera.lookAt( new THREE.Vector3(0,-60,0) );

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

    this.surfaceY = -200;
    this.videoInitiated = false;
    this.videoMaterialTexture = null;

    this.table =null;

    var radius = 15;
   // this.createEnvironment();
    this.createBall(radius);
    this.createPaddles(radius);
    this.createLights();
    this.createArena(radius);
  },

  createBall: function(radius){
    var ballGeo = new THREE.CubeGeometry( radius*2,radius*2,radius*2 )
      , ballMat = new THREE.MeshPhongMaterial( { color: 0xffffff })
      , ballMesh = new THREE.Mesh( ballGeo, ballMat );
    ballMesh.position.y = this.surfaceY;
    this.gameContainer.add(ballMesh);

    this.ballMeshes.push(ballMesh);
  },

  createPaddles: function(radius){
    var halfDepth = (this.bounds.b-this.bounds.t)/2;

    var userPaddleGeo = new THREE.CubeGeometry( 100, 30, 3 )
      , userPaddleMat = new THREE.MeshPhongMaterial( { color:0xffffff, transparent:false })
      , userPaddle = new THREE.Mesh( userPaddleGeo, userPaddleMat );
    userPaddle.position.z = this.bounds.t-halfDepth-radius;
    userPaddle.position.y = this.surfaceY+ radius;
    this.gameContainer.add(userPaddle);

    var opponentPaddleGeo = new THREE.CubeGeometry( 100, 30, 3 )
      , opponentPaddleMat = new THREE.MeshPhongMaterial( { color:0xffffff, transparent:false })
      , opponentPaddle = new THREE.Mesh( opponentPaddleGeo, opponentPaddleMat );
    opponentPaddle.position.z = this.bounds.b-halfDepth+radius;
    opponentPaddle.position.y = this.surfaceY + radius;
    this.gameContainer.add(opponentPaddle);

    this.paddleMeshes.push(userPaddle)
    this.paddleMeshes.push(opponentPaddle)
  },

  createLights: function(){

    var spotLight = new THREE.SpotLight( 0xFFFFFF );
    spotLight.intensity = 0.8;
    spotLight.position.set( 0, 1300, -400 );
    this.gameContainer.add(spotLight);

    var pointLight = new THREE.PointLight( 0xFFFFFF );
    pointLight.intensity = 1;
    pointLight.position.set( 0, 0, 150 );
    this.gameContainer.add(pointLight);

    var dirLight = new THREE.DirectionalLight( 0xFFFFFF );
    dirLight.position.set( 0, 200, 1000 );
    dirLight.position.set( 0,200,-1000 );
    //dirLight.lookAt(this.gameContainer.position);
    this.gameContainer.add(dirLight);

  },

  createEnvironment: function(){

    var envGeo = new THREE.PlaneGeometry(4000,2000,40,40)
      , envMat = new THREE.MeshPhongMaterial({wireframe:false,color:0x000000, transparent:false , opacity:0.3, side: THREE.DoubleSide})
      , vertices = envGeo.vertices;

    for (var i = vertices.length - 1; i >= 0; i--) {
      vertices[i].z = Math.random()*100;
    };

    envGeo.computeFaceNormals();

    var envMesh = new THREE.Mesh(envGeo, envMat)
    envMesh.position.y = -500;
    envMesh.position.z = 1000;
    envMesh.rotation.x = -Math.PI*.5;

    this.gameContainer.add(envMesh);
  },

  createArena: function(radius){
    var w = this.bounds.r-this.bounds.l+radius*2
      , h = w/16*9//-this.surfaceY//this.bounds.b-this.bounds.t+radius*2
      , d = this.bounds.t-this.bounds.b // NOTE: adjusting depth requires moving the camera+
      , arenaPosZ = 0//;d*.5
      , wallMaterial = new THREE.MeshBasicMaterial({color:0x990000});
      
    var arenaBottomGeo = new THREE.PlaneGeometry(100,100,1,1)
    
    this.arenaBottomMesh = new THREE.Mesh( arenaBottomGeo, wallMaterial );
    this.arenaBottomMesh.rotation.x = Math.PI*1.5;
    this.arenaBottomMesh.position.y = h*-.5;
    this.arenaBottomMesh.position.z = arenaPosZ;

    var arenaLeftGeo = new THREE.PlaneGeometry(d,120,1,1)    
    this.arenaLeftMesh = new THREE.Mesh( arenaLeftGeo, wallMaterial );
    this.arenaLeftMesh.rotation.y = -Math.PI*.5;
    this.arenaLeftMesh.position.x = w*-.5;
    this.arenaLeftMesh.position.y = h*-.5+60;
    this.arenaLeftMesh.position.z = arenaPosZ;

    var arenaRightGeo = new THREE.PlaneGeometry(d,120,1,1)
    
    this.arenaRightMesh = new THREE.Mesh( arenaRightGeo, wallMaterial );
    this.arenaRightMesh.rotation.y = Math.PI*.5;
  
    this.arenaRightMesh.position.x = w*.5;
    this.arenaRightMesh.position.y = h*-.5+60;
    this.arenaRightMesh.position.z = arenaPosZ;

    var tableGeo = new THREE.PlaneGeometry(100,100,10,10)
      , tableMat = new THREE.MeshPhongMaterial({color:0xffffff, opacity:0.2,transparent:true});
    
    this.table = new THREE.Mesh( tableGeo, tableMat );
    this.table.rotation.x = -Math.PI*.5
    this.table.position.y = this.surfaceY-radius;

    this.gameContainer.add(this.arenaBottomMesh);

    this.gameContainer.add(this.arenaLeftMesh);
    this.gameContainer.add(this.arenaRightMesh);
    this.gameContainer.add(this.table);
  },

  createForce: function(force){
    var fw = (this.bounds.r-this.bounds.l)
      , fh = (this.bounds.b-this.bounds.t)
      , hw = fw/2
      , hh = fh/2
      , fc = force.type == 'attract' ? 0x00ff00 : 0xff0000;

    var forceGeo = new THREE.SphereGeometry( force.mass*50 ) // TODO *50 is not correct. what would be the proper scale in comparison to the puck?
      , forceMat = new THREE.MeshPhongMaterial({ opacity: 0.1, color: fc, transparent:true })
      , forceMesh = new THREE.Mesh( forceGeo, forceMat );
    forceMesh.position.x = (1-force.x)*fw-hw;
    forceMesh.position.z = force.y*fh-hh;
    forceMesh.position.y = this.surfaceY;
    this.gameContainer.add(forceMesh);
    this.forceMeshes.push(forceMesh);
  },

  render: function(alpha){
    var fw = (this.bounds.r-this.bounds.l)
      , fh = (this.bounds.b-this.bounds.t)
      , hw = fw/2
      , hh = fh/2;

    this.table.scale.set(fw/100,fh/100,1);
    

    this.arenaLeftMesh.position.x = hw*-1
    this.arenaRightMesh.position.x = hw
    this.arenaBottomMesh.scale.set(fw/100,fh/100,1);

    if( this.videoPlane ) {
      this.videoPlane.position.z = fh;
    }

    // Create any new forces
    for(var i=this.forceMeshes.length; i < this.forces.length; i++ )
      this.createForce(this.forces[i]);

    // Create any new ball/pucks
    for(var i=this.ballMeshes.length; i < this.pointMasses.length; i++ )
      this.createBall(15); // TODO don't hard-code radius...

    // Update ball/puck
    for(var i=0; i < this.pointMasses.length; i++){
      var puck = this.pointMasses[i]
        , mesh = this.ballMeshes[i];
      mesh.position.x = puck.current.x*fw-hw;
      mesh.position.z = puck.current.y*fh-hh;
    }

    // Update paddles
    for(var i=0; i < this.paddles.length; i++ ){
      var mesh = this.paddleMeshes[i]
        , paddle = this.paddles[i];
      mesh.position.x = paddle.x*fw-hw;
      mesh.scale.x = (paddle.width*fw)/100;
    }

    // Update video texture
    var tex = this.videoMaterialTexture;
    if( tex && tex.image.readyState === tex.image.HAVE_ENOUGH_DATA ){
      tex.needsUpdate = true;
    }

    this.renderer.render( this.scene, this.camera );
  },

  setVideoTexture : function(canvas) {
    if( !this.videoInitiated ) {
      this.videoInitiated = true;

      var w = this.bounds.r-this.bounds.l
        , h = w/16*9;

      this.videoMaterialTexture = new THREE.Texture(canvas);
      this.videoMaterialTexture.needsUpdate = true;
      this.videoMaterialTexture.generateMipmaps = false;

      var videoGeo = new THREE.PlaneGeometry(w,h)
        , videoMat = new THREE.MeshBasicMaterial({map : this.videoMaterialTexture, side: THREE.DoubleSide})
      
      this.videoPlane = new THREE.Mesh(videoGeo, videoMat);

      this.videoPlane.position.x = 0;
      this.videoPlane.position.y =  0;
      this.videoPlane.position.z = (this.bounds.b-this.bounds.t)*.5

      this.gameContainer.add(this.videoPlane);
    }
  }
}

/**
 * Linear interpolation
 *
 * `t` should be a number between 0 and 1, when at 0 it will be the same as `c` 
 * and when at 1 it will be the same as `n`.
 * 
 * @param {Number} n
 * @param {Number} c
 * @param {Number} t
 * @return {Number} between c and n
 */
function lerp(n,c,t){
  return c + (n-c) * t;
}