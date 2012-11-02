var settings = require('./settings');

module.exports = Renderer;

function Renderer(canvas,bounds){
  canvas.parentNode.className += ' renderer-3d';

  this.initiated = false;
  this.inverted = false;
  this.shaderLibrary = {};
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
    this.inverted = true;
    this.gameContainer.rotation.y = Math.PI;
  },

  create: function(){

    var w = window.innerWidth
      , h = window.innerHeight;
    
    var camera = new THREE.PerspectiveCamera( 70, w/h, 10, 4000 );

    camera.position.y = 220;
    camera.position.z = 1200;
    camera.lookAt( new THREE.Vector3(0,-600,-500) );

    var scene = new THREE.Scene();

    var gameContainer = new THREE.Object3D();
    gameContainer.rotation.y = 0 // 180°
    scene.add(gameContainer);

    var renderer = new THREE.WebGLRenderer({canvas: this.canvas, antialias:true});

    //shadows
    if( settings.data.useShadows ) {
      renderer.shadowCameraNear = 3;
      renderer.shadowCameraFar = 2400;
      renderer.shadowCameraFov = 30;

      renderer.shadowMapBias = 0.0059;
      renderer.shadowMapDarkness = 0.5;
      renderer.shadowMapWidth = 2048*2;
      renderer.shadowMapHeight = 2048*2;

      renderer.shadowMapEnabled = true;
      renderer.shadowMapSoft = true;
    }
    
    renderer.sortElements = false;
    renderer.setSize( w, h );
    window.addEventListener( 'resize', function(){
      w = window.innerWidth;
      h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      renderer.setSize( w, h );

    }, false );

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.gameContainer = gameContainer;

    this.surfaceY = -200;
    this.videoInitiated = false;
    this.videoMaterialTexture = null;

    this.table = null;
    this.ballRadius = 15;
   
    this.loadShaders();

  },

  loadShaders: function() {

    var scope = this;

    this.loadFiles( 
      ["javascript/simple_vertex.glsl",
      "javascript/shield_fs.glsl"]
    , function(result){

        scope.shaderLibrary["simple_vs"] = result[0];
        scope.shaderLibrary["shield_fs"] = result[1];

        scope.createBall();
        scope.createPaddles();
        scope.createLights();
        scope.createArena();

        scope.initiated = true;

    }, function(e){console.log(e)});
  },

  loadFiles: function(urls, callback, errorCallback) {
    var numUrls = urls.length;
    var numComplete = 0;
    var result = [];

    // Callback for a single file
    function partialCallback(text, urlIndex) {
        result[urlIndex] = text;
        numComplete++;

        // When all files have downloaded
        if (numComplete == numUrls) {
            callback(result);
        }
    }

    for (var i = 0; i < numUrls; i++) {
        this.loadFile(urls[i], i, partialCallback, errorCallback);
    }
  },

  loadFile: function(url, data, callback, errorCallback) {
    // Set up an asynchronous request
    var request = new XMLHttpRequest();
    request.open('GET', url, true);

    // Hook the event that gets called as the request progresses
    request.onreadystatechange = function () {
        // If the request is "DONE" (completed or failed)
        if (request.readyState == 4) {
            // If we got HTTP status 200 (OK)
            if (request.status == 200) {
                callback(request.responseText, data)
            } else { // Failed
                errorCallback(url);
            }
        }
    };

    request.send(null);    
  },

  createBall: function(){
    var ballGeo = new THREE.CubeGeometry( this.ballRadius*2,this.ballRadius*4,this.ballRadius*2 )
      , ballMat = new THREE.MeshPhongMaterial( { color: 0xffffff })
      , ballMesh = new THREE.Mesh( ballGeo, ballMat );


    ballMesh.position.y = this.surfaceY;
    
    ballMesh.castShadow = settings.data.useShadows;
    ballMesh.receiveShadow = settings.data.useShadows;

    this.gameContainer.add(ballMesh);

    this.ballMeshes.push(ballMesh);

    //temp bind to onbounds
     this.pointMasses[0].onbounds = this.testBallHit.bind(this);
  },

  createPaddles: function(){
    var halfDepth = (this.bounds.b-this.bounds.t)/2;

    var userPaddleGeo = new THREE.CubeGeometry( 100, 60, 20 )
      , userPaddleMat = new THREE.MeshPhongMaterial( { color:0xffffff, transparent:false })
      , userPaddle = new THREE.Mesh( userPaddleGeo, userPaddleMat );
    userPaddle.position.z = this.bounds.t-halfDepth-this.ballRadius;
    userPaddle.position.y = this.surfaceY;
    this.gameContainer.add(userPaddle);

    var opponentPaddleGeo = new THREE.CubeGeometry( 100, 30, 20 )
      , opponentPaddleMat = new THREE.MeshPhongMaterial( { color:0xffffff, transparent:false })
      , opponentPaddle = new THREE.Mesh( opponentPaddleGeo, opponentPaddleMat );
    opponentPaddle.position.z = this.bounds.b-halfDepth+this.ballRadius;
    opponentPaddle.position.y = this.surfaceY + this.ballRadius*2;
    this.gameContainer.add(opponentPaddle);

    userPaddle.castShadow = settings.data.useShadows;
    userPaddle.receiveShadow = settings.data.useShadows;

    opponentPaddle.castShadow = settings.data.useShadows;
    opponentPaddle.receiveShadow = settings.data.useShadows;

    this.paddleMeshes.push(userPaddle)
    this.paddleMeshes.push(opponentPaddle)
  },

  createLights: function(){

    var ambLight = new THREE.AmbientLight(0x222222,0.4);
    this.scene.add(ambLight)

    var hemLight = new THREE.HemisphereLight(0xffffff, 0xeeeeee,0.8);
    this.scene.add(hemLight)

    var pointLight = new THREE.PointLight( 0xFFFFFF,1.0,2000 );
    pointLight.position = new THREE.Vector3(0,100,1100);
    this.scene.add(pointLight);

   /* var s = new THREE.Mesh( new THREE.SphereGeometry(1000,10,10),new THREE.MeshBasicMaterial({wireframe:true}))
    s.position = new THREE.Vector3(0,this.surfaceY+50,0);
    this.gameContainer.add(s);
*/
    var pointLight2 = new THREE.PointLight( 0xFFFFFF , 0.3, 2000 );
    pointLight2.position = this.camera.position.clone();
    this.scene.add(pointLight2);

     
    this.dirLight = new THREE.SpotLight( 0xFFFFFF );

    this.dirLight.intensity = 0;

    this.dirLight.castShadow = settings.data.useShadows;
 
    this.dirLight.position = this.camera.position.clone();

    this.dirLight.position.x += 270;
    this.dirLight.position.y += 1000;
    this.dirLight.position.z = 0;

    this.dirLight.target.position = new THREE.Vector3(0,0,0)
    this.dirLight.shadowCameraVisible = false;
    this.dirLight.shadowCameraRight     =  6;
    this.dirLight.shadowCameraLeft      = -6;
    this.dirLight.shadowCameraTop       =  6;
    this.dirLight.shadowCameraBottom    = -6;
    this.scene.add(this.dirLight);

  },

  createEnvironment: function(){

    var envGeo = new THREE.PlaneGeometry(4000,2000,40,40)
      , envMat = new THREE.MeshLambertMaterial({shading: THREE.FlatShading,color:0x000000, transparent:false , opacity:0.3, side: THREE.DoubleSide})
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

  createArena: function(){
    var w = this.bounds.r-this.bounds.l+this.ballRadius*2
      , h = w/16*9//-this.surfaceY//this.bounds.b-this.bounds.t+this.ballRadius*2
      , d = this.bounds.t-this.bounds.b // NOTE: adjusting depth requires moving the camera+
      , arenaPosZ = 0//;d*.5
      , sideH = 150
      , transArenaMaterial = new THREE.MeshPhongMaterial({color:0xdd0000, opacity:0.7,transparent:true})
      , arenaWallMaterial = new THREE.MeshPhongMaterial({color:0xd70000})
      , groundMaterial = new THREE.MeshPhongMaterial({color:0xefefef});
      
    var arenaBottomGeo = new THREE.PlaneGeometry(100,100,1,1)
    
    this.arenaBottomMesh = new THREE.Mesh( arenaBottomGeo, transArenaMaterial );
    this.arenaBottomMesh.receiveShadow = true;
    this.arenaBottomMesh.rotation.x = Math.PI*1.5;
    this.arenaBottomMesh.position.y = this.surfaceY;

    var arenaLeftGeo = new THREE.PlaneGeometry(100,sideH,1,1);
    
    this.arenaLeftMesh = new THREE.Mesh( arenaLeftGeo, arenaWallMaterial );
    this.arenaLeftMesh.castShadow = settings.data.useShadows;
    this.arenaLeftMesh.receiveShadow = true;
    this.arenaLeftMesh.rotation.y = -Math.PI*.5;
    this.arenaLeftMesh.position.x = w*-.5;
    this.arenaLeftMesh.position.y = this.surfaceY+sideH*.5;

    var envGroundGeo = new THREE.PlaneGeometry(1000,100,1,1)    
    this.envLeftMesh = new THREE.Mesh( envGroundGeo, groundMaterial );
    this.envLeftMesh.rotation.x = Math.PI*1.5;
    this.envLeftMesh.position.y = this.surfaceY+sideH;
    this.envLeftMesh.castShadow = settings.data.useShadows;

    this.envRightMesh = new THREE.Mesh( envGroundGeo, groundMaterial );
    this.envRightMesh.rotation.x = Math.PI*1.5;
    this.envRightMesh.position.y = this.surfaceY+sideH;
    this.envRightMesh.castShadow = settings.data.useShadows;

    var arenaRightGeo = new THREE.PlaneGeometry(100,sideH,1,1)    
    this.arenaRightMesh = new THREE.Mesh( arenaRightGeo, arenaWallMaterial );
    this.arenaRightMesh.castShadow = settings.data.useShadows;
    this.arenaRightMesh.receiveShadow = true;
    this.arenaRightMesh.rotation.y = Math.PI*.5;
    this.arenaRightMesh.position.x = w*.5;
    this.arenaRightMesh.position.y = this.surfaceY+sideH*.5;

    var tableGeo = new THREE.PlaneGeometry(100,100,10,10)
      , tableMat = new THREE.MeshPhongMaterial({wireframe:false,color:0xffffff, opacity:0,transparent:true});
    
    this.table = new THREE.Mesh( tableGeo, tableMat );
    this.table.rotation.x = -Math.PI*.5
    this.table.position.y = this.surfaceY+2;

    this.blackBottomMesh = new THREE.Mesh( tableGeo, new THREE.MeshBasicMaterial({color:0x000000}) );
    this.blackBottomMesh.rotation.x = -Math.PI*.5
    this.blackBottomMesh.position.y = this.surfaceY-30;

    this.hostShieldUniforms = {
      brightness:  { type: "f", value: 1.0 }
    }

    var hostShieldMaterial = new THREE.ShaderMaterial({
      transparent:true,
      uniforms:  this.hostShieldUniforms,
      vertexShader: this.shaderLibrary["simple_vs"],
      fragmentShader: this.shaderLibrary["shield_fs"]
    });
    
    this.guestShieldUniforms = {
      brightness:  { type: "f", value: 1.0 }
    }

    var guestShieldMaterial = new THREE.ShaderMaterial({
      transparent:true,
      uniforms:  this.guestShieldUniforms,
      vertexShader: this.shaderLibrary["simple_vs"],
      fragmentShader: this.shaderLibrary["shield_fs"]
    });

    this.hostShieldMesh = new THREE.Mesh( new THREE.CubeGeometry(100,sideH,4,1,1,1), hostShieldMaterial);
    this.hostShieldMesh.rotation.x = Math.PI
    this.hostShieldMesh.position.y = this.surfaceY+sideH*.5;
    this.hostShieldMesh.receiveShadow = false;

    this.guestShieldMesh = new THREE.Mesh( new THREE.CubeGeometry(100,sideH,4,1,1,1), guestShieldMaterial );
    this.guestShieldMesh.rotation.x = Math.PI
    this.guestShieldMesh.position.y = this.surfaceY+sideH*.5;
    this.guestShieldMesh.receiveShadow = false;


    this.guestCube = new THREE.Mesh( new THREE.CubeGeometry(100,100,500,1,1,1), new THREE.MeshPhongMaterial({color:0x000000}) );
    this.guestCube.position.z = this.bounds.b - 200;
    this.guestCube.position.y = this.surfaceY - 300;

    this.gameContainer.add(this.guestCube);

    this.gameContainer.add(this.arenaBottomMesh);
    this.gameContainer.add(this.arenaLeftMesh);
    this.gameContainer.add(this.arenaRightMesh);
    this.gameContainer.add(this.envLeftMesh);
    this.gameContainer.add(this.envRightMesh);
    
    this.gameContainer.add(this.table);
    this.gameContainer.add(this.blackBottomMesh);

    this.gameContainer.add(this.hostShieldMesh);
    this.gameContainer.add(this.guestShieldMesh);
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

    if(!this.initiated) return;

    var fw = (this.bounds.r-this.bounds.l)
      , fh = (this.bounds.b-this.bounds.t)
      , hw = fw/2
      , hh = fh/2;

    if( this.hostShieldUniforms.brightness.value > 0.4 ) this.hostShieldUniforms.brightness.value *= 0.98;
    if( this.guestShieldUniforms.brightness.value > 0.4 ) this.guestShieldUniforms.brightness.value *= 0.98;

    if( settings.data.useShadows !== this.renderer.shadowMapEnabled ) {
      this.renderer.clearTarget( this.dirLight.shadowMap );
      this.renderer.shadowMapAutoUpdate = settings.data.useShadows;
      this.renderer.shadowMapEnabled = settings.data.useShadows;
      this.dirLight.castShadow = settings.data.useShadows; 
    }

    this.table.scale.set(fw/100,fh/100,1);
    this.blackBottomMesh.scale.set(fw/93,fh/87,1);
 
    var videoHeight = fw/100/16*9;

    if(this.videoPlane){
        this.videoPlane.scale.set(fw/100,videoHeight,1);
        this.videoPlane.position.y = this.surfaceY + videoHeight*.5*100;
        this.videoPlane.position.z = fh*.5;
        
        this.videoPlane.rotation.y = Math.PI*((this.inverted)?1:0);
        this.videoPlane.position.z = hh * ((this.inverted)?1:-1);
    }

    this.guestCube.scale.set(fw/100,videoHeight,1)
    this.guestCube.position.z = (hh+250) * ((this.inverted)?-1:1);
    this.guestCube.position.y = this.surfaceY + videoHeight*.5*100;

    this.guestShieldMesh.scale.set(fw/100,1,1);
    this.guestShieldMesh.position.z = (hh-5) * ((this.inverted)?-1:1);

    this.hostShieldMesh.scale.set(fw/100,1,1);
    this.hostShieldMesh.position.z = (hh+15) * ((this.inverted)?1:-1);
    
    this.envLeftMesh.position.x = fw*.5 + 500;
    this.envLeftMesh.scale.y = fh/100;
    this.envRightMesh.position.x = -fw*.5 - 500;
    this.envRightMesh.scale.y = fh/100;

    this.arenaLeftMesh.position.x = hw*-1
    this.arenaLeftMesh.scale.x = -fh/100;

    this.arenaRightMesh.position.x = hw
    this.arenaRightMesh.scale.x = -fh/100;
    
    this.arenaBottomMesh.scale.set(fw/100,fh/85,1);

    
    // Create any new forces
    for(var i=this.forceMeshes.length; i < this.forces.length; i++ ) {
      this.createForce(this.forces[i]);
    }
      

    // Create any new ball/pucks
    for(var i=this.ballMeshes.length; i < this.pointMasses.length; i++ ) {
      this.createBall(); // TODO don't hard-code radius...
     
     //temp tap into onbounds event
      this.pointMasses[this.ballMeshes.length-1].onbounds = this.testBallHit.bind(this);
    }
      

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

      mesh.position.z = (1-paddle.y)*-fh + hh;
      mesh.scale.x = (paddle.width*fw)/100;
    }

    // Update video texture
    var tex = this.videoMaterialTexture;
    if( tex && tex.image.readyState === tex.image.HAVE_ENOUGH_DATA ){
      tex.needsUpdate = true;
     
    }

    this.renderer.render( this.scene, this.camera );
  },

  testBallHit : function(at){

    if( at.y <= this.bounds.t/settings.data.arenaHeight ){
          var x = this.paddles[0].x
            , hw = this.paddles[0].width / 2;

          if( at.x >= x - hw && at.x <= x + hw ){
            //host hit
          } else {
            //host miss
            this.hostShieldUniforms.brightness.value = 2.4;
          }

          //audio.playFx3D("hit", new THREE.Vector3((puck.current.x-.5)*-0.8,0,puck.current.y*10));

        } else if ( at.y >= this.bounds.b/settings.data.arenaHeight ){
          
          var x = this.paddles[1].x
            , hw = this.paddles[1].width / 2;
          
          if( at.x >= x - hw && at.x <= x + hw ){
            //guest hit

          } else {
            //guest miss

            this.guestShieldUniforms.brightness.value = 2.4;
          }
          
        }
        else {
         //hit side wall
        }
  },

  setVideoTexture : function(canvas) {

    if( !this.videoInitiated ) {
      this.videoInitiated = true;

      var w = this.bounds.r-this.bounds.l
        , h = w/4*3;

      this.videoMaterialTexture = new THREE.Texture(canvas);
     // this.videoMaterialTexture.needsUpdate = true;
      this.videoMaterialTexture.generateMipmaps = false;

      var videoGeo = new THREE.PlaneGeometry(100,100)
        , videoMat = new THREE.MeshBasicMaterial({map : this.videoMaterialTexture, side: THREE.DoubleSide})
      
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