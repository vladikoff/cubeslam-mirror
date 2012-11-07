var settings = require('./settings');

module.exports = Renderer;

function Renderer(canvas,bounds,world ){
  canvas.parentNode.className += ' renderer-3d';

  this.world = world;
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

Renderer.ARENA_COLUMNS = 18;

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
      "javascript/shield_fs.glsl",
       "javascript/arena_fs.glsl"]
    , function(result){

        scope.shaderLibrary["simple_vs"] = result[0];
        scope.shaderLibrary["shield_fs"] = result[1];
        scope.shaderLibrary["arena_fs"] = result[2];

        scope.createBall();
        scope.createPaddles();
        scope.createLights();
        scope.createArena();
        scope.createShields();

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
      , ballMat = new THREE.MeshLambertMaterial( { color: settings.data.ballColor })
      , ballMesh = new THREE.Mesh( ballGeo, ballMat );


    ballMesh.position.y = this.surfaceY;
    
    ballMesh.castShadow = settings.data.useShadows;
    ballMesh.receiveShadow = settings.data.useShadows;

    this.gameContainer.add(ballMesh);

    this.ballMeshes.push(ballMesh);

    //temp bind to onbounds
     //this.pointMasses[0].onbounds = this.testBallHit.bind(this);

  },

  createPaddles: function(){
    var halfDepth = (this.bounds.b-this.bounds.t)/2;

    var opponentPaddleGeo = new THREE.CubeGeometry( 100, 60, settings.data.paddleDepth )
      , opponentPaddleMat = new THREE.MeshLambertMaterial({shading: THREE.FlatShading, color:0x999999})
      , opponentPaddle = new THREE.Mesh( opponentPaddleGeo, opponentPaddleMat );
    opponentPaddle.position.z = this.bounds.t+halfDepth-settings.data.paddleDepth*.5;
    opponentPaddle.position.y = this.surfaceY;
    this.gameContainer.add(opponentPaddle);

    var userPaddleGeo = new THREE.CubeGeometry( 100, 60, settings.data.paddleDepth )
      , userPaddleMat = new THREE.MeshLambertMaterial({shading: THREE.FlatShading, color:0x999999})
      , userPaddle = new THREE.Mesh( userPaddleGeo, userPaddleMat );
    userPaddle.position.z = this.bounds.b+halfDepth+settings.data.paddleDepth*.5;
    userPaddle.position.y = this.surfaceY + this.ballRadius;
    this.gameContainer.add(userPaddle);

    this.paddleMeshes.push(opponentPaddle)
    this.paddleMeshes.push(userPaddle)
  },

  createLights: function(){

    var ambLight = new THREE.AmbientLight(0x222222,0.4);
    this.scene.add(ambLight)

    var hemLight = new THREE.HemisphereLight(0xffffff, 0xeeeeee,0.6);
    this.scene.add(hemLight)

    var pointLight = new THREE.PointLight( 0xFFFFFF,1.0,2000 );
    pointLight.position = new THREE.Vector3(0,100,1100);
    this.scene.add(pointLight);

    var pointLight2 = new THREE.PointLight( 0xFFFFFF , 0.3, 2000 );
    pointLight2.position = this.camera.position.clone();
    pointLight2.position.x += 40;
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
    var w = settings.data.arenaWidth
      , hw = w*.5 
      , h = w/16*9//-this.surfaceY//this.bounds.b-this.bounds.t+this.ballRadius*2
      , hh = h*0.5//-this.surfaceY//this.bounds.b-this.bounds.t+this.ballRadius*2
      , d = settings.data.arenaHeight // NOTE: adjusting depth requires moving the camera+
      , hd = d*.5
      , arenaPosZ = 0//;d*.5
      , sideH = 150
      , boxDepth = settings.data.videoBoxDepth
      , transArenaMaterial = new THREE.MeshPhongMaterial({color:settings.data.arenaColor, opacity:0.7,transparent:true})
      , arenaWallMaterial = new THREE.MeshPhongMaterial({color:settings.data.arenaColor})
      , groundMaterial = new THREE.MeshPhongMaterial({color:0xefefef});
      
    var arenaBottomGeo = new THREE.PlaneGeometry(w,d,1,1)
    this.arenaBottomMesh = new THREE.Mesh( arenaBottomGeo, transArenaMaterial );
    this.arenaBottomMesh.receiveShadow = true;
    this.arenaBottomMesh.rotation.x = Math.PI*1.5;
    this.arenaBottomMesh.position.y = this.surfaceY;

    var arenaSideGeo = new THREE.CubeGeometry(5,sideH,d,1,1,1);
    this.arenaLeftMesh = new THREE.Mesh( arenaSideGeo, arenaWallMaterial );
    
    this.arenaLeftMesh.position.x = hw;
    this.arenaLeftMesh.position.y = this.surfaceY+sideH*.5
   
    this.arenaRightMesh = new THREE.Mesh( arenaSideGeo, arenaWallMaterial );
    this.arenaRightMesh.position.x = -hw;
    this.arenaRightMesh.position.y = this.surfaceY+sideH*.5;

    var maxAnisotropy = this.renderer.getMaxAnisotropy();

    var gridTexture = THREE.ImageUtils.loadTexture( "images/grid.png" );
    gridTexture.mapping = THREE.UVMapping;
    gridTexture.anisotropy = maxAnisotropy;
    gridTexture.minFilter = gridTexture.magFilter = THREE.LinearMipMapLinearFilter;
    gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;

    this.tableUniforms = {
      tGrid: { type: "t", value: gridTexture},
      scale:  { type: "v2", value: new THREE.Vector2(Renderer.ARENA_COLUMNS , 30 ) }
    }

    var tableMaterial = new THREE.ShaderMaterial({
      transparent:true,
      uniforms:  this.tableUniforms,
      vertexShader: this.shaderLibrary["simple_vs"],
      fragmentShader: this.shaderLibrary["arena_fs"]
    });

    var tableGeo = new THREE.PlaneGeometry(w,d,10,10);
    
    this.table = new THREE.Mesh( tableGeo, tableMaterial );
    this.table.rotation.x = -Math.PI*.5
    this.table.position.y = this.surfaceY+2;

    var reflectionBoxGeo = new THREE.CubeGeometry(w,100,d,1,1,1,null, { px: true, nx: true, py: false, ny: true, pz: true, nz: true });
    var blackBottomMesh = new THREE.Mesh( reflectionBoxGeo, new THREE.MeshBasicMaterial({color:0x000000}) );
    blackBottomMesh.position.y = this.surfaceY-50;

    this.hostCube = new THREE.Mesh( new THREE.CubeGeometry(w,h,500,1,1,1), new THREE.MeshPhongMaterial({color:0x000000}) );

    this.hostCube.position.set(this.surfaceY - 300, hh,(hd+settings.data.videoBoxDepth) * ((this.inverted)?-1:1));
    
    this.gameContainer.add(this.hostCube);
    this.gameContainer.add(this.arenaBottomMesh);
    this.gameContainer.add(this.arenaLeftMesh);
    this.gameContainer.add(this.arenaRightMesh);
    
    this.gameContainer.add(this.table);
    this.gameContainer.add(blackBottomMesh);


  },

  createShields: function() {

    var w = settings.data.arenaWidth
      , hw = w*.5 
      , h = w/16*9//-this.surfaceY//this.bounds.b-this.bounds.t+this.ballRadius*2
      , hh = h*0.5//-this.surfaceY//this.bounds.b-this.bounds.t+this.ballRadius*2
      , d = settings.data.arenaHeight // NOTE: adjusting depth requires moving the camera+
      , hd = d*.5
      , sideH = 150;

     var hSGeo = new THREE.CubeGeometry(w,sideH,4,1,1,1,null, { px: false, nx: false, py: true, ny: false, pz: true, nz: true });

    //guest paddle 
    var columnValues = new Array(Renderer.ARENA_COLUMNS);
    for (var i = columnValues.length - 1; i >= 0; i--) {
      columnValues[i] = 0;
    };

    this.guestShieldUniforms = {
      uColumns: { type:"f", value:Renderer.ARENA_COLUMNS},
      uColumnValues: { type: "fv1", value: columnValues},
      uBrightness:  { type: "f", value: 1.0 },
      uColor: { type: "c", value: new THREE.Color( settings.data.ballColor ) }
    }

    var guestShieldMaterial = new THREE.ShaderMaterial({
      transparent:true,
      uniforms:  this.guestShieldUniforms,
      vertexShader: this.shaderLibrary["simple_vs"],
      fragmentShader: this.shaderLibrary["shield_fs"]
    });
  
    this.guestShieldMesh = new THREE.Mesh( hSGeo, guestShieldMaterial);
    this.guestShieldMesh.rotation.y = Math.PI
    this.guestShieldMesh.position.y = this.surfaceY+sideH*.5;
    this.guestShieldMesh.position.z = settings.data.arenaHeight*.5 * ((this.inverted)?1:-1);
    
    //host paddle 

    var columnValues2 = new Array(Renderer.ARENA_COLUMNS);
    for (var i = columnValues2.length - 1; i >= 0; i--) {
      columnValues2[i] = 0;
    };

    this.hostShieldUniforms = {
      uColumnValues: { type: "fv1", value: columnValues2},
      uColumns: { type:"f", value:Renderer.ARENA_COLUMNS},
      uBrightness:  { type: "f", value: 1.0 },
      uColor: { type: "c", value: new THREE.Color( settings.data.ballColor ) }
    }

    var hostShieldMaterial = new THREE.ShaderMaterial({
      transparent:true,
      uniforms:  this.hostShieldUniforms,
      vertexShader: this.shaderLibrary["simple_vs"],
      fragmentShader: this.shaderLibrary["shield_fs"]
    });

    this.hostShieldMesh = new THREE.Mesh( hSGeo, hostShieldMaterial );
    this.hostShieldMesh.position.y = this.surfaceY+sideH*.5;
    this.hostShieldMesh.position.z = hd * ((this.inverted)?-1:1);

    this.gameContainer.add(this.guestShieldMesh);
    this.gameContainer.add(this.hostShieldMesh);
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

    if( this.guestShieldUniforms.uBrightness.value > 0.4 ) this.guestShieldUniforms.uBrightness.value *= 0.98;
    if( this.hostShieldUniforms.uBrightness.value > 0.4 ) this.hostShieldUniforms.uBrightness.value *= 0.98;

    if( settings.data.useShadows !== this.renderer.shadowMapEnabled ) {
      this.renderer.clearTarget( this.dirLight.shadowMap );
      this.renderer.shadowMapAutoUpdate = settings.data.useShadows;
      this.renderer.shadowMapEnabled = settings.data.useShadows;
      this.dirLight.castShadow = settings.data.useShadows; 
    }

    var videoHeight = fw/100/16*9;

    if(this.videoPlane){
        this.videoPlane.scale.set(fw/100,videoHeight,1);
        this.videoPlane.position.y = this.surfaceY + videoHeight*.5*100;
        this.videoPlane.position.z = fh*.5;
        
        this.videoPlane.rotation.y = Math.PI*((this.inverted)?1:0);
        this.videoPlane.position.z = hh * ((this.inverted)?1:-1);
    }


    //update colors
    if( this.arenaBottomMesh.material.color.getHex() != settings.data.arenaColor) {
      this.arenaBottomMesh.material.color.setHex( settings.data.arenaColor );
      this.arenaLeftMesh.material.color.setHex( settings.data.arenaColor );
    }
    

    // Create any new forces
    for(var i=this.forceMeshes.length; i < this.forces.length; i++ ) {
      this.createForce(this.forces[i]);
    }
      

    // Create any new ball/pucks
    for(var i=this.ballMeshes.length; i < this.pointMasses.length; i++ ) {
      this.createBall(); // TODO don't hard-code radius...
     
     //temp tap into onbounds event
     // this.pointMasses[this.ballMeshes.length-1].onbounds = this.testBallHit.bind(this);

    }
      

    // Update ball/puck
    for(var i=0; i < this.pointMasses.length; i++){
      var puck = this.pointMasses[i]
        , mesh = this.ballMeshes[i];
      mesh.position.x = puck.current.x*fw-hw;
      mesh.position.z = puck.current.y*fh-hh;
      if( mesh.material.color.getHex() != settings.data.ballColor) {
        this.guestShieldUniforms.uColor.value = new THREE.Color( settings.data.ballColor )
        this.hostShieldUniforms.uColor.value = new THREE.Color( settings.data.ballColor )
        mesh.material.color.setHex( settings.data.ballColor );

      }
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

    //update hits
    this.updateHits();

    this.renderer.render( this.scene, this.camera );
  },

  updateHits : function(){

    var targetColumn;

    var hostHits = this.world.hostHits;
    for (var i = hostHits.length - 1; i >= 0; i--) {
      targetColumn = Math.floor(hostHits[i]*Renderer.ARENA_COLUMNS);
      this.hostShieldUniforms.uColumnValues.value[targetColumn] = 1;
    };

    var guestHits = this.world.guestHits;
    for (var i = guestHits.length - 1; i >= 0; i--) {
      targetColumn = Math.floor(guestHits[i]*Renderer.ARENA_COLUMNS);
      this.guestShieldUniforms.uColumnValues.value[targetColumn] = 1;
    };
  }
  ,
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