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

function Player()  {
  this.cubeMesh = null;
  this.cubeVideoMaterial = null;
  this.cubeUpY = 0;
  this.cubeDownY = 0;
  this.shieldMesh = null;

  var columns = []
  for (var i = Renderer.ARENA_COLUMNS - 1; i >= 0; i--) {
    columns.push(0);
  };

  this.shieldUniforms =  {
      resolution: { type: "v2", value:new THREE.Vector3(900,300)},
      uColumns: { type:"f", value:Renderer.ARENA_COLUMNS},
      uColumnValues: { type: "fv1", value: columns},
      uBrightness:  { type: "f", value: 1.0 },
      uColor: { type: "c", value: new THREE.Color( settings.data.ballColor ) }
  }
}

Renderer.prototype = {

  invert: function(){
    // rotate this.gameContainer 180 degrees
    this.inverted = true;
    //this.gameContainer.rotation.y = Math.PI;
  },

  create: function(){

    if( this.initiated ) return;

    var w = window.innerWidth
      , h = window.innerHeight;
    
    var camera = new THREE.PerspectiveCamera( 70, w/h, 10, 4000 );

    camera.position.x = 600;
    camera.position.y = 1220;
    camera.position.z = 0;

    this.cameraTarget = new THREE.Vector3(0,-400,0);
    camera.lookAt(this.cameraTarget);
    
    var scene = new THREE.Scene();

    var gameContainer = new THREE.Object3D();
    gameContainer.rotation.y = 0 // 180°
    scene.add(gameContainer);

    var renderer = new THREE.WebGLRenderer({canvas: this.canvas, antialias:true});

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
   
    this.playerA = new Player();
    this.playerB = new Player();

    this.loadShaders();

  },

  loadShaders: function() {

    var scope = this;

    this.loadFiles( 
      ["javascript/simple_vertex.glsl",
       "javascript/shield_fs.glsl",
       "javascript/arena_fs.glsl",
       "javascript/cpu_fs.glsl"]
    , function(result){

        scope.shaderLibrary["simple_vs"] = result[0];
        scope.shaderLibrary["shield_fs"] = result[1];
        scope.shaderLibrary["arena_fs"] = result[2];
        scope.shaderLibrary["cpu_fs"] = result[3];

        scope.createBall();
        scope.createPaddles();
        scope.createLights();
        scope.createArena();
        scope.createShields();

        scope.initAnimation();

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
    
    //ballMesh.castShadow = settings.data.useShadows;
    //ballMesh.receiveShadow = settings.data.useShadows;

    this.gameContainer.add(ballMesh);

    this.ballMeshes.push(ballMesh);

    //temp bind to onbounds
     //this.pointMasses[0].onbounds = this.testBallHit.bind(this);

  },

  createPaddles: function(){
    var halfDepth = (this.bounds.b-this.bounds.t)/2;

    var paddleMaterial = new THREE.MeshLambertMaterial({shading: THREE.FlatShading, color:0xffffff});

    var opponentPaddleGeo = new THREE.CubeGeometry( 100, 60, settings.data.paddleDepth )
      , opponentPaddle = new THREE.Mesh( opponentPaddleGeo, paddleMaterial );
    opponentPaddle.position.z = this.bounds.t+halfDepth-settings.data.paddleDepth*.5;
    opponentPaddle.position.y = this.surfaceY;
    this.gameContainer.add(opponentPaddle);

    var userPaddleGeo = new THREE.CubeGeometry( 100, 60, settings.data.paddleDepth )
      , userPaddle = new THREE.Mesh( userPaddleGeo, paddleMaterial );
    userPaddle.position.z = -settings.data.arenaHeight*.5+settings.data.paddleDepth*.5;
    userPaddle.position.y = this.surfaceY;
    this.gameContainer.add(userPaddle);

    this.paddleMeshes.push(opponentPaddle)
    this.paddleMeshes.push(userPaddle)
  },

  createLights: function(){

    var ambLight = new THREE.AmbientLight(0x222222,0.2);
    this.scene.add(ambLight)

    var hemLight = new THREE.HemisphereLight(0xffffff, 0xeeeeee,0.6);
    this.scene.add(hemLight)

    var pointLight = new THREE.PointLight( 0xFFFFFF,0.6,2000 );
    pointLight.position = new THREE.Vector3(0,1000,0);
    this.scene.add(pointLight);

    var pointLight2 = new THREE.PointLight( 0xFFFFFF , 0.3, 2000 );
    pointLight2.position = this.camera.position.clone();
    pointLight2.position.x += 40;
    //this.scene.add(pointLight2);

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
      , transArenaMaterial = new THREE.MeshPhongMaterial({color:settings.data.arenaColor, opacity:0.8,transparent:true})
      , arenaWallMaterial = new THREE.MeshPhongMaterial({color:settings.data.arenaColor})
      , groundMaterial = new THREE.MeshPhongMaterial({color:0xefefef});
      
    //boundingbox
    var arenaBottomGeo = new THREE.PlaneGeometry(w,d,1,1)
    this.arenaBottomMesh = new THREE.Mesh( arenaBottomGeo, transArenaMaterial );
    this.arenaBottomMesh.receiveShadow = true;
    this.arenaBottomMesh.rotation.x = Math.PI*1.5;
    this.arenaBottomMesh.position.y = this.surfaceY;
    this.gameContainer.add(this.arenaBottomMesh);

    var arenaSideGeo = new THREE.CubeGeometry(5,sideH,d,1,1,1);
    this.arenaLeftMesh = new THREE.Mesh( arenaSideGeo, arenaWallMaterial );
    this.arenaLeftMesh.position.x = hw;
    this.arenaLeftMesh.position.y = this.surfaceY+sideH*.5
    this.gameContainer.add(this.arenaLeftMesh);

    this.arenaRightMesh = new THREE.Mesh( arenaSideGeo, arenaWallMaterial );
    this.arenaRightMesh.position.x = -hw;
    this.arenaRightMesh.position.y = this.surfaceY+sideH*.5;
    this.gameContainer.add(this.arenaRightMesh);

    //table
    var gridTexture = THREE.ImageUtils.loadTexture( "images/grid.png" );
    gridTexture.mapping = THREE.UVMapping;
    gridTexture.anisotropy = this.renderer.getMaxAnisotropy();;
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

    this.table = new THREE.Mesh( new THREE.PlaneGeometry(w,d,1,1), tableMaterial );
    this.table.rotation.x = -Math.PI*.5
    this.table.position.y = this.surfaceY+2;
    this.gameContainer.add(this.table);

    var reflectionBoxGeo = new THREE.CubeGeometry(w,100,d,1,1,1,null, { px: true, nx: true, py: false, ny: true, pz: true, nz: true });
    var blackBottomMesh = new THREE.Mesh( reflectionBoxGeo, new THREE.MeshBasicMaterial({color:0x000000, side:THREE.DoubleSide}) );
    blackBottomMesh.position.y = this.surfaceY-50;
    this.gameContainer.add(blackBottomMesh);

    //video cubes
    var cubeSideMaterial = new THREE.MeshPhongMaterial({color:0xffffff})
    var videoMaterial = new THREE.MeshBasicMaterial({color:0x000000}) 
    var cubeMaterials = [
      cubeSideMaterial,        // Left side
      cubeSideMaterial,       // Right side
      cubeSideMaterial,         // Top side
      cubeSideMaterial,      // Bottom side
      videoMaterial,       // Front side
      cubeSideMaterial         // Back side
    ]
    var cubeA = new THREE.Mesh( new THREE.CubeGeometry(w,h,settings.data.videoBoxDepth,1,1,1, cubeMaterials),new THREE.MeshFaceMaterial()  );
    cubeA.position.set( 0,this.surfaceY - hh + sideH,(hd+settings.data.videoBoxDepth*.5+2));
    this.playerA.cubeUpY = this.surfaceY + hh;
    this.playerA.cubeDownY = this.surfaceY - hh
    this.playerA.cubeMesh = cubeA;
    this.gameContainer.add(cubeA);

    //init remote video texture
    var videoMaterialTexture = new THREE.Texture(document.getElementById("remoteInput"));
    videoMaterialTexture.generateMipmaps = false;

    this.cpuUniforms = {
      time: { type: "f", value:0},
      resolution: { type: "v2", value:new THREE.Vector3(640,320)},
      mouse: { type: "v2", value:new THREE.Vector3(0.5,0.5)}
    }

    var cpuMaterial = new THREE.ShaderMaterial({
      transparent:true,
      uniforms:  this.cpuUniforms,
      vertexShader: this.shaderLibrary["simple_vs"],
      fragmentShader: this.shaderLibrary["cpu_fs"]
    });

    var cubeMaterials = [
      cubeSideMaterial,        // Left side
      cubeSideMaterial,       // Right side
      cubeSideMaterial,     // Top side
      cubeSideMaterial,     // Bottom side
      cpuMaterial,     // Front side
      cubeSideMaterial         // Back side
    ]
    var cubeB = new THREE.Mesh( new THREE.CubeGeometry(w,h,settings.data.videoBoxDepth,1,1,1,cubeMaterials), new THREE.MeshFaceMaterial()  );
    cubeB.position.set(0, this.surfaceY - hh, (-hd-settings.data.videoBoxDepth*.5-1) );
    this.playerB.cubeUpY = this.surfaceY + hh;
    this.playerB.cubeDownY = this.surfaceY - hh

    var videoMaterial2 = new THREE.MeshLambertMaterial({map:videoMaterialTexture})
    this.playerB.cubeVideoMaterial = videoMaterial2;
    this.playerB.cubeCpuMaterial = cpuMaterial;

    this.playerB.cubeMesh = cubeB;
    this.gameContainer.add(cubeB);

  },

  createShields: function() {

    var w = settings.data.arenaWidth
      , hw = w*.5 
      , h = w/16*9//-this.surfaceY//this.bounds.b-this.bounds.t+this.ballRadius*2
      , hh = h*0.5//-this.surfaceY//this.bounds.b-this.bounds.t+this.ballRadius*2
      , d = settings.data.arenaHeight // NOTE: adjusting depth requires moving the camera+
      , hd = d*.5
      , sideH = 150;

     var shieldGeo = new THREE.CubeGeometry(w,sideH,4,1,1,1,null, { px: false, nx: false, py: true, ny: false, pz: true, nz: true });

    var shieldMesh = new THREE.Mesh( shieldGeo, new THREE.ShaderMaterial({transparent:true,uniforms:  this.playerA.shieldUniforms,vertexShader: this.shaderLibrary["simple_vs"],fragmentShader: this.shaderLibrary["shield_fs"]}));
    shieldMesh.position.y = this.surfaceY+sideH*.5;
    shieldMesh.position.z = hd * ((this.inverted)?-1:1);
    this.playerA.shieldMesh = shieldMesh
    this.gameContainer.add(shieldMesh);

    shieldMesh = new THREE.Mesh( shieldGeo, new THREE.ShaderMaterial({transparent:true,uniforms:  this.playerB.shieldUniforms,vertexShader: this.shaderLibrary["simple_vs"],fragmentShader: this.shaderLibrary["shield_fs"]}));
    shieldMesh.rotation.y = Math.PI
    shieldMesh.position.y = this.surfaceY+sideH*.5;
    shieldMesh.position.z = settings.data.arenaHeight*.5 * ((this.inverted)?1:-1);
    this.playerB.shieldMesh = shieldMesh
    this.gameContainer.add(shieldMesh);
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

  initAnimation: function(){
    
    new TWEEN.Tween(this.playerB.cubeMesh.position).to({y:this.playerB.cubeUpY},3000).start();
    new TWEEN.Tween(this.playerA.cubeMesh.position).to({y:this.playerB.cubeDownY},3000).start();

    var scope = this;  
    new TWEEN.Tween(this.camera.position)
      .delay(500)
      .to({y:220,z:1100,x:0},2000)
      .onUpdate( function(){
        scope.camera.lookAt(scope.cameraTarget);
      })
      .start();

  },

  render: function(alpha){

    if(!this.initiated) return;

    var fw = (this.bounds.r-this.bounds.l)
      , fh = (this.bounds.b-this.bounds.t)
      , hw = fw/2
      , hh = fh/2;

    if( this.playerA.shieldUniforms.uBrightness.value > 0.4 ) this.playerA.shieldUniforms.uBrightness.value *= 0.98;
    if( this.playerB.shieldUniforms.uBrightness.value > 0.4 ) this.playerB.shieldUniforms.uBrightness.value *= 0.98;


    if( settings.data.useShadows !== this.renderer.shadowMapEnabled ) {
      this.renderer.clearTarget( this.dirLight.shadowMap );
      this.renderer.shadowMapAutoUpdate = settings.data.useShadows;
      this.renderer.shadowMapEnabled = settings.data.useShadows;
      this.dirLight.castShadow = settings.data.useShadows; 
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
     
    }

    // Update ball/puck
    for(var i=0; i < this.pointMasses.length; i++){
      var puck = this.pointMasses[i]
        , mesh = this.ballMeshes[i];
      mesh.position.x = puck.current.x*fw-hw;
      mesh.position.z = puck.current.y*fh-hh;

      this.cpuUniforms.mouse.value.x = puck.current.x;
      this.cpuUniforms.mouse.value.y = puck.current.y;
      this.cpuUniforms.time.value += 0.01;

      if( mesh.material.color.getHex() != settings.data.ballColor) {
        this.playerA.shieldUniforms.uColor.value = new THREE.Color( settings.data.ballColor )
        this.playerA.shieldUniforms.uColor.value = new THREE.Color( settings.data.ballColor )
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

    console.log(this.playerB.cubeMesh.material)
    var tex = this.playerB.cubeVideoMaterial.map;

    if( tex && tex.image.readyState === tex.image.HAVE_ENOUGH_DATA ){
      tex.needsUpdate = true;
    }

    //update hits
    this.updateHits();

    this.renderer.render( this.scene, this.camera );

    TWEEN.update();
  },

  updateHits : function(){

    var targetColumn;

    var hostHits = this.world.hostHits;
    for (var i = hostHits.length - 1; i >= 0; i--) {
      targetColumn = Math.floor(hostHits[i]*Renderer.ARENA_COLUMNS);
      this.playerA.shieldUniforms.uColumnValues.value[targetColumn] = 1;
    };

    var guestHits = this.world.guestHits;
    for (var i = guestHits.length - 1; i >= 0; i--) {
      targetColumn = Math.floor(guestHits[i]*Renderer.ARENA_COLUMNS);
      this.playerB.shieldUniforms.uColumnValues.value[targetColumn] = 1;
    };
  }
  ,
  setVideoTexture : function(canvas) {

    if( !this.videoInitiated ) {
      this.videoInitiated = true;

      var w = this.bounds.r-this.bounds.l
        , h = w/4*3;

      
      this.playerB.cubeHeight = h;
      
      var scope = this;
      var anim = new TWEEN.Tween(this.playerB.cubeMesh.position)
        .to( { y:  this.playerB.cubeDownY}, 500 )
        .onComplete(function(){

          scope.playerB.cubeMesh.geometry.materials[4] = scope.playerB.cubeVideoMaterial;

          var anim2 = new TWEEN.Tween(scope.playerB.cubeMesh.position)
          .to( { y:  scope.playerB.cubeUpY}, 1000 )
          .start();

        })
        .start();

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