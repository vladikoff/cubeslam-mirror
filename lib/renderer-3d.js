
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
    var camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 14000 );
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

    var radius = 15;
    this.createEnvironment();
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

    this.ballMesh = ballMesh;
  },

  createPaddles: function(radius){
    var halfDepth = (this.bounds.b-this.bounds.t)/2;

    var userPaddleGeo = new THREE.CubeGeometry( 200, 100, 3 )
      , userPaddleMat = new THREE.MeshPhongMaterial( { color:0xffffff, transparent:false })
      , userPaddle = new THREE.Mesh( userPaddleGeo, userPaddleMat );
    userPaddle.position.z = this.bounds.t-halfDepth-radius;
    userPaddle.position.y = this.surfaceY;
    this.gameContainer.add(userPaddle);

    var opponentPaddleGeo = new THREE.CubeGeometry( 200, 100, 3 )
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
    pointLight.position.set( 0, 0, 150 );
    this.gameContainer.add(pointLight);

    var dirLight = new THREE.DirectionalLight( 0xFFFFFF );
    dirLight.position.set( 0, 200, 1000 );
    dirLight.position.set( 0,0,-1000 );
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
      , d = 5300 // NOTE: adjusting depth requires moving the camera+
      , arenaPosZ = 0//;d*.5
      , wallMaterial = new THREE.MeshPhongMaterial({wireframe:false,color:0xffffff, transparent:true , opacity:0.3, side: THREE.DoubleSide});
      
    var arenaBottomGeo = new THREE.PlaneGeometry(w,d,1,1)
      , arenaBottomMesh = new THREE.Mesh( arenaBottomGeo, wallMaterial );
    arenaBottomMesh.rotation.x = Math.PI*1.5;
    arenaBottomMesh.position.y = h*-.5;
    arenaBottomMesh.position.z = arenaPosZ;

    var arenaTopGeo = new THREE.PlaneGeometry(w,d,1,1)
      , arenaTopMesh = new THREE.Mesh( arenaTopGeo, wallMaterial );
    arenaTopMesh.rotation.x = Math.PI*.5;
    arenaTopMesh.position.y = h*.5;
    arenaTopMesh.position.z = arenaPosZ;
    
    var arenaLeftGeo = new THREE.PlaneGeometry(d,h,1,1)
      , arenaLeftMesh = new THREE.Mesh( arenaLeftGeo, wallMaterial );
    arenaLeftMesh.rotation.y = Math.PI*.5;
    arenaLeftMesh.position.x = w*-.5;
    arenaLeftMesh.position.z = arenaPosZ;


    var arenaRightGeo = new THREE.PlaneGeometry(d,h,1,1)
      , arenaRightMesh = new THREE.Mesh( arenaRightGeo, wallMaterial );
    arenaRightMesh.rotation.y = -Math.PI*.5;
    arenaRightMesh.position.x = w*.5;
    arenaRightMesh.position.z = arenaPosZ;

    var tableGeo = new THREE.PlaneGeometry(w,this.bounds.b-this.bounds.t+radius*2,10,10)
      , tableMat = new THREE.MeshPhongMaterial({color:0x999999, opacity:0.9,transparent:false})
      , table = new THREE.Mesh( tableGeo, tableMat );
    table.rotation.x = -Math.PI*.5
    table.position.y = this.surfaceY-radius;

    this.gameContainer.add(arenaBottomMesh);
    //this.gameContainer.add(arenaTopMesh);
    this.gameContainer.add(arenaLeftMesh);
    this.gameContainer.add(arenaRightMesh);
    this.gameContainer.add(table);
  },

  createForce: function(force){
    var forceGeo = new THREE.SphereGeometry( force.mass )
      , forceMat = new THREE.MeshPhongMaterial({ opacity: 0.1, color: 0x00ff00, transparent:true })
      , forceMesh = new THREE.Mesh( forceGeo, forceMat );
    forceMesh.position.x = force.x-hw;
    forceMesh.position.z = force.y-hh;
    forceMesh.position.y = this.surfaceY;
    this.gameContainer.add(forceMesh);
    this.forceMeshes.push(forceMesh);
  },

  render: function(alpha){
    var fw = (this.bounds.r-this.bounds.l)
      , hw = fw/2
      , hh = (this.bounds.b-this.bounds.t)/2;

    // Update ball/puck
    var puck = this.pointMasses[0];
    this.ballMesh.position.x = puck.current.x-hw;
    this.ballMesh.position.z = puck.current.y-hh;
    
    // Render forces
    /*if( this.forces.length > this.forceMeshes.length ){
      for(var i=this.forceMeshes.length; i < this.forces.length; i++ )
        this.createForce(this.forces[i]);
    }*/

    // Update paddles
    for(var i=0; i < this.paddles.length; i++ ){
      var mesh = this.paddleMeshes[i]
        , paddle = this.paddles[i];
     
      mesh.position.x = lerp(mesh.position.x,paddle.x*fw-hw,alpha);
      mesh.scale.x = paddle.width/100;
      mesh.scale.y = 30/100;
    }

    this.renderer.render( this.scene, this.camera );
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