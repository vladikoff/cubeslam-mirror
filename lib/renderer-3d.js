var settings = require('./settings');

module.exports = Renderer;

function Renderer(canvas,bounds){
  this.canvas = canvas;
  this.bounds = bounds;
  this.inverted = false;
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
    this.inverted = true;
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

    var renderer = new THREE.WebGLRenderer({canvas: this.canvas, antialias:true});
    renderer.sortElements = false;
    renderer.setSize( window.innerWidth, window.innerHeight );
    window.addEventListener( 'resize', function(){
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      scene.add(camera);
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
    var ballGeo = new THREE.CubeGeometry( radius*2,radius*4,radius*2 )
      , ballMat = new THREE.MeshPhongMaterial( { color: 0xffffff })
      , ballMesh = new THREE.Mesh( ballGeo, ballMat );


    ballMesh.position.y = this.surfaceY;
    this.gameContainer.add(ballMesh);

    this.ballMeshes.push(ballMesh);
  },

  createPaddles: function(radius){
    var halfDepth = (this.bounds.b-this.bounds.t)/2;

    var userPaddleGeo = new THREE.CubeGeometry( 100, 60, 20 )
      , userPaddleMat = new THREE.MeshPhongMaterial( { color:0xffffff, transparent:false })
      , userPaddle = new THREE.Mesh( userPaddleGeo, userPaddleMat );
    userPaddle.position.z = this.bounds.t-halfDepth-radius;
    userPaddle.position.y = this.surfaceY;
    this.gameContainer.add(userPaddle);

    var opponentPaddleGeo = new THREE.CubeGeometry( 100, 30, 20 )
      , opponentPaddleMat = new THREE.MeshPhongMaterial( { color:0xffffff, transparent:false })
      , opponentPaddle = new THREE.Mesh( opponentPaddleGeo, opponentPaddleMat );
    opponentPaddle.position.z = this.bounds.b-halfDepth+radius;
    opponentPaddle.position.y = this.surfaceY + radius*2;
    this.gameContainer.add(opponentPaddle);

    this.paddleMeshes.push(userPaddle)
    this.paddleMeshes.push(opponentPaddle)
  },

  createLights: function(){

    var pointLight = new THREE.PointLight( 0xFFFFFF );
    pointLight.intensity = 0.8;
    pointLight.position = this.camera.position;
    this.scene.add(pointLight);

    var dirLight = new THREE.DirectionalLight( 0xFFFFFF );
    dirLight.intensity = 0.5;
    dirLight.position.set( 0, 1000, 0 );
    dirLight.lookAt(this.gameContainer.position);
    this.scene.add(dirLight);

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
      , wallMaterial = new THREE.MeshBasicMaterial({color:0x990000, opacity:0.9})
      , groundMaterial = new THREE.MeshBasicMaterial({color:0xefefef});
      
    var arenaBottomGeo = new THREE.PlaneGeometry(100,100,1,1)
    
    this.arenaBottomMesh = new THREE.Mesh( arenaBottomGeo, wallMaterial );
    this.arenaBottomMesh.rotation.x = Math.PI*1.5;
    this.arenaBottomMesh.position.y = this.surfaceY;
    this.arenaBottomMesh.position.z = arenaPosZ;

    var arenaLeftGeo = new THREE.PlaneGeometry(100,120,1,1)    
    this.arenaLeftMesh = new THREE.Mesh( arenaLeftGeo, wallMaterial );
    this.arenaLeftMesh.rotation.y = -Math.PI*.5;
    this.arenaLeftMesh.position.x = w*-.5;
    this.arenaLeftMesh.position.y = this.surfaceY+60;
    this.arenaLeftMesh.position.z = arenaPosZ;

    var envGroundGeo = new THREE.PlaneGeometry(1000,100,1,1)    
    this.envLeftMesh = new THREE.Mesh( envGroundGeo, groundMaterial );
    this.envLeftMesh.rotation.x = Math.PI*1.5;
    this.envLeftMesh.position.y = this.surfaceY+120;
    this.envLeftMesh.position.z = arenaPosZ;

    this.envRightMesh = new THREE.Mesh( envGroundGeo, groundMaterial );
    this.envRightMesh.rotation.x = Math.PI*1.5;
    this.envRightMesh.position.y = this.surfaceY+120;
    this.envRightMesh.position.z = arenaPosZ;


    var arenaRightGeo = new THREE.PlaneGeometry(100,120,1,1)    
    this.arenaRightMesh = new THREE.Mesh( arenaRightGeo, wallMaterial );
    this.arenaRightMesh.rotation.y = Math.PI*.5;
    this.arenaRightMesh.position.x = w*.5;
    this.arenaRightMesh.position.y = this.surfaceY+60;
    this.arenaRightMesh.position.z = arenaPosZ;

    var tableGeo = new THREE.PlaneGeometry(100,100,10,10)
      , tableMat = new THREE.MeshPhongMaterial({color:0xffffff, opacity:0.2,transparent:true});
    
    this.table = new THREE.Mesh( tableGeo, tableMat );
    this.table.rotation.x = -Math.PI*.5
    this.table.position.y = this.surfaceY+2;

    this.gameContainer.add(this.arenaBottomMesh);
    this.gameContainer.add(this.arenaLeftMesh);
    this.gameContainer.add(this.envLeftMesh);
    this.gameContainer.add(this.envRightMesh);
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
    var videoHeight = fw/100/4*3;

    if(this.videoPlane){
        this.videoPlane.scale.set(fw/100,videoHeight,1);
        this.videoPlane.position.y = this.surfaceY + videoHeight*.5*100;
        this.videoPlane.position.z = fh*.5;
        
        this.videoPlane.rotation.y = Math.PI*((this.inverted)?1:0);
        this.videoPlane.position.z = hh * ((this.inverted)?-1:1);
    }
    
    this.envLeftMesh.position.x = fw*.5 + 500;
    this.envLeftMesh.scale.y = fh/100;
    this.envRightMesh.position.x = -fw*.5 - 500;
    this.envRightMesh.scale.y = fh/100;

    this.arenaLeftMesh.position.x = hw*-1
    this.arenaLeftMesh.scale.x = -fh/100;

    this.arenaRightMesh.position.x = hw
    this.arenaRightMesh.scale.x = -fh/100;
    
    this.arenaBottomMesh.scale.set(fw/100,fh/90,1);

    

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

      mesh.position.z = ((mesh.position.z > 0)?1:-1)*hh
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
        , h = w/4*3;

      this.videoMaterialTexture = new THREE.Texture(canvas);
      this.videoMaterialTexture.needsUpdate = true;
      this.videoMaterialTexture.generateMipmaps = false;

      var videoGeo = new THREE.PlaneGeometry(100,100)
        , videoMat = new THREE.MeshBasicMaterial({map : this.videoMaterialTexture, side: THREE.DoubleSide, opacity:0.8, transparent:true})
      
      this.videoPlane = new THREE.Mesh(videoGeo, videoMat);

      this.videoPlane.position.x = 0;
      this.videoPlane.position.y =  0;
      
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