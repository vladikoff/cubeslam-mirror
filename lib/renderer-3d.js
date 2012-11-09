var settings = require('./settings')
  , world = require('./world');

module.exports = Renderer;

function Renderer(canvas){
  canvas.parentNode.className += ' renderer-3d';

  this.initiated = false;
  this.inverted = false;
  this.shaderLibrary = {};
  this.canvas = canvas;
  this.puckMeshes = [];
  this.forceMeshes = [];
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

  this.shieldUniforms = {
    resolution: { type: "v2", value:new THREE.Vector3(900,300)},
    uColumns: { type:"f", value:Renderer.ARENA_COLUMNS},
    uColumnValues: { type: "fv1", value: columns},
    uBrightness:  { type: "f", value: 1.0 },
    uColor: { type: "c", value: new THREE.Color( settings.data.puckColor ) }
  }
}

Renderer.prototype = {

  triggerEvent: function( id, paramObj ) {

    if( id == "hit") {
      if(paramObj.side == 1) {
        this.playerB.shieldUniforms.uBrightness.value = 1;
      }
      else {
        this.playerA.shieldUniforms.uBrightness.value = 1;
      }
    }

  },

  invert: function(){
    // rotate this.gameContainer 180 degrees
    this.inverted = true;
    //this.gameContainer.rotation.y = Math.PI;
  },

  create: function(){

    if( this.initiated ) return;

    var w = window.innerWidth
      , h = window.innerHeight;
    
    var camera = new THREE.PerspectiveCamera( 70, w/h, 10, 14000 );

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

    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.physicallyBasedShading = true;

    scene.fog = new THREE.Fog( 0xe8e8d0, 1000, 14000 );

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.gameContainer = gameContainer;

    this.surfaceY = -200;
    this.videoInitiated = false;
    this.videoMaterialTexture = null;

    this.table = null;
   
    this.playerA = new Player();
    this.playerB = new Player();

    this.loadShaders();

  },

  loadShaders: function() {

    this.loadFiles( 
      ["javascript/simple_vertex.glsl",
       "javascript/shield_fs.glsl",
       "javascript/arena_fs.glsl",
       "javascript/cpu_fs.glsl"]
    , function(result){

        this.shaderLibrary["simple_vs"] = result[0];
        this.shaderLibrary["shield_fs"] = result[1];
        this.shaderLibrary["arena_fs"] = result[2];
        this.shaderLibrary["cpu_fs"] = result[3];

        this.createPuck();
        this.createPaddles();
        this.createLights();
        this.createArena();
        this.createShields();
        this.createNature();
        this.initAnimation();

        this.initiated = true;

    }.bind(this), function(e){console.log(e)});
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

  createPuck: function(){
    var r = settings.data.puckRadius;
    var puckGeo = new THREE.CubeGeometry( r*2,r*4,r*2 )
      , puckMat = new THREE.MeshLambertMaterial( { color: settings.data.puckColor })
      , puckMesh = new THREE.Mesh( puckGeo, puckMat );

    puckMesh.position.y = this.surfaceY;
    
    this.gameContainer.add(puckMesh);
    this.puckMeshes.push(puckMesh);

  },

  createPaddles: function(){
    var paddleMaterial = new THREE.MeshLambertMaterial({shading: THREE.FlatShading, color:0xffffff});

    var opponentPaddleGeo = new THREE.CubeGeometry( 100, 60, settings.data.paddleDepth )
      , opponentPaddle = new THREE.Mesh( opponentPaddleGeo, paddleMaterial );
    
    opponentPaddle.position.y = this.surfaceY;
    this.gameContainer.add(opponentPaddle);

    var userPaddleGeo = new THREE.CubeGeometry( 100, 60, settings.data.paddleDepth )
      , userPaddle = new THREE.Mesh( userPaddleGeo, paddleMaterial );
    
    userPaddle.position.y = this.surfaceY;
    this.gameContainer.add(userPaddle);

    this.paddleMeshes.push(opponentPaddle)
    this.paddleMeshes.push(userPaddle)
  },

  createLights: function(){

    var ambLight = new THREE.AmbientLight(0x222222,0);
    this.scene.add(ambLight)

    var hemLight = new THREE.HemisphereLight(0xe8e8d0, 0xeeeeee,0.6);
    this.scene.add(hemLight)

    var pointLight = new THREE.PointLight( 0xFFFFFF,0.6,2000 );
    pointLight.position = new THREE.Vector3(0,1000,0);
    this.scene.add(pointLight);

    var pointLight2 = new THREE.PointLight( 0xFFFFFF , 0.3, 2000 );
    pointLight2.position = this.camera.position.clone();
    pointLight2.position.x += 40;
    //this.scene.add(pointLight2);

    var dirLight = new THREE.DirectionalLight(0xe8e8d0,1);
    dirLight.color.setHSV( 0.1, 0.1, 1 );
    dirLight.position.set( -1, 1.75, 1 );
    dirLight.position.multiplyScalar( 50 );
    this.scene.add(dirLight);

  },

  createArena: function(){
    var w = settings.data.arenaWidth
      , hw = w*.5 
      , h = w/16*9//-this.surfaceY//this.bounds.b-this.bounds.t+this.puckRadius*2
      , hh = h*0.5//-this.surfaceY//this.bounds.b-this.bounds.t+this.puckRadius*2
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
      scale: { type: "v2", value: new THREE.Vector2(Renderer.ARENA_COLUMNS , 30 ) }
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
      , h = w/16*9//-this.surfaceY//this.bounds.b-this.bounds.t+this.puckRadius*2
      , hh = h*0.5//-this.surfaceY//this.bounds.b-this.bounds.t+this.puckRadius*2
      , d = settings.data.arenaHeight // NOTE: adjusting depth requires moving the camera+
      , hd = d*.5
      , sideH = 150;

     var shieldGeo = new THREE.CubeGeometry(w,sideH,4,1,1,1,null, { px: false, nx: false, py: true, ny: false, pz: true, nz: true });

    var shieldMesh = new THREE.Mesh( shieldGeo, new THREE.ShaderMaterial({transparent:true,uniforms:  this.playerA.shieldUniforms,vertexShader: this.shaderLibrary["simple_vs"],fragmentShader: this.shaderLibrary["shield_fs"]}));
    shieldMesh.position.y = this.surfaceY+sideH*.5;
    shieldMesh.position.z = hd;
    this.playerA.shieldMesh = shieldMesh
    this.gameContainer.add(shieldMesh);

    shieldMesh = new THREE.Mesh( shieldGeo, new THREE.ShaderMaterial({transparent:true,uniforms:  this.playerB.shieldUniforms,vertexShader: this.shaderLibrary["simple_vs"],fragmentShader: this.shaderLibrary["shield_fs"]}));
    shieldMesh.rotation.y = Math.PI
    shieldMesh.position.y = this.surfaceY+sideH*.5;
    shieldMesh.position.z = -hd;
    this.playerB.shieldMesh = shieldMesh
    this.gameContainer.add(shieldMesh);
  },

  createNature: function(){
      var geometry = new THREE.PlaneGeometry(4000,12000,10,15)
      geometry.dynamic = true;

      var noise = new SimplexNoise();
      var n;
      
      var faceIndices = [ 'a', 'b', 'c', 'd' ];

      var len = geometry.vertices.length;
      for (var i = 0; i < len; i++) {
        
        var point=geometry.vertices[i]

        n = noise.noise(point.x / 4000 *2, point.y / 12000 * 2);
        n = Math.abs(n);

        var uvY = ((point.y+1500) / 3000)

        var color = new THREE.Color( 0x1a99db );
        color.setRGB( color.r - uvY*0.3, color.g - uvY*0.3, color.b - uvY*0.3 );
        geometry.colors[i] = color;

        geometry.vertices[i].x += n; 
        geometry.vertices[i].z = n * 1205 * Math.max(0,uvY-0.3)
      }

      for ( var i = 0; i < geometry.faces.length; i++ ) 
      {
          var face = geometry.faces[ i ];
          numberOfSides = ( face instanceof THREE.Face3 ) ? 3 : 4;
          for( var j = 0; j < numberOfSides; j++ ) 
          {
              vertexIndex = face[ faceIndices[ j ] ];
              face.vertexColors[ j ] = geometry.colors[ vertexIndex ];
          }
      }

      geometry.computeFaceNormals();
      geometry.computeCentroids();

      var natureMaterial = new THREE.MeshLambertMaterial( {vertexColors: THREE.VertexColors, shading:THREE.FlatShading })

      var mountainMesh = new THREE.Mesh(geometry, natureMaterial)
      mountainMesh.rotation.x = Math.PI*-.5
      mountainMesh.position.z = -2000;
      mountainMesh.position.y = this.surfaceY-150;
      mountainMesh.scale.x = 5;
      mountainMesh.scale.z = 1;
      this.gameContainer.add(mountainMesh);
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
      .to({y:120,z:1100,x:0},2000)
      .onUpdate( function(){
        scope.camera.lookAt(scope.cameraTarget);
      })
      .start();

  },

  render: function(world, alpha){

    if(!this.initiated) return;

    // TODO instead of world.bounds we should probably just use settings?
    var fw = (world.bounds.r-world.bounds.l)
      , fh = (world.bounds.b-world.bounds.t)
      , hw = fw/2
      , hh = fh/2;

    if( this.playerA.shieldUniforms.uBrightness.value > 0.15 ) 
      this.playerA.shieldUniforms.uBrightness.value *= 0.97;
    if( this.playerB.shieldUniforms.uBrightness.value > 0.15 ) 
      this.playerB.shieldUniforms.uBrightness.value *= 0.97;

    // update colors
    if( this.arenaBottomMesh.material.color.getHex() != settings.data.arenaColor) {
      this.arenaBottomMesh.material.color.setHex( settings.data.arenaColor );
      this.arenaLeftMesh.material.color.setHex( settings.data.arenaColor );
    }
    
    // Create any new forces
    for(var i=this.forceMeshes.length; i < world.forces.length; i++ ) {
      this.createForce(world.forces[i]);
    }
      
    // Create any new pucks
    for(var i=this.puckMeshes.length; i < world.pucks.length; i++ ) {
      this.createPuck();
    }

    var side = world.host ? 1 : -1;

    // Update puck
    for(var i=0; i < world.pucks.length; i++){
      var puck = world.pucks[i]
        , mesh = this.puckMeshes[i];
      mesh.position.x = (puck.current.x*fw-hw)*side;
      mesh.position.z = (puck.current.y*fh-hh)*side;

      //update eyes
      this.cpuUniforms.mouse.value.x = puck.current.x;
      this.cpuUniforms.mouse.value.y = puck.current.y;
      this.cpuUniforms.time.value += 0.01;

      if( mesh.material.color.getHex() != settings.data.puckColor) {
        this.playerA.shieldUniforms.uColor.value = new THREE.Color( settings.data.puckColor )
        this.playerA.shieldUniforms.uColor.value = new THREE.Color( settings.data.puckColor )
        mesh.material.color.setHex( settings.data.puckColor );

      }
    }

    // Update paddles
    for(var i=0; i < world.paddles.length; i++ ){
      var paddle = world.paddles[i]
        , mesh = this.paddleMeshes[i];

      // get the centers of the paddles
      // TODO calculate these in Rect#update() instead?
      var x = paddle.r - paddle.width/2
        , y = paddle.b - paddle.height/2;
      mesh.position.x = (x*fw-hw)*side;
      mesh.position.z = (y*fh-hh)*side;
      mesh.scale.x = (paddle.width*fw)/100;

      // base camera position on users movement
      if( i == 0 )
        this.camera.position.x = 40*(x-0.5);
    }

    // Update video texture
    var tex = this.playerB.cubeVideoMaterial.map;
    if( tex && tex.image.readyState === tex.image.HAVE_ENOUGH_DATA ){
      tex.needsUpdate = true;
    }

    // Update hits
    this.updateHits(world);

    this.renderer.render( this.scene, this.camera );

    TWEEN.update();
  },

  updateHits : function(world){
    var targetColumn;

    //reset
    for (var i = Renderer.ARENA_COLUMNS - 1; i >= 0; i--) {
      this.playerA.shieldUniforms.uColumnValues.value[i] = 0;
      this.playerB.shieldUniforms.uColumnValues.value[i] = 0;
    };

    var hits = world.host ? world.players.a.hits : world.players.b.hits.map(mirror);

    for (var i = hits.length - 1; i >= 0; i--) {
      targetColumn = Math.floor(hits[i]*Renderer.ARENA_COLUMNS);
      this.playerB.shieldUniforms.uColumnValues.value[targetColumn] = 1;
    };

    hits = !world.host ? world.players.a.hits.map(mirror) : world.players.b.hits;
    for (var i = hits.length - 1; i >= 0; i--) {
      targetColumn = Math.floor(hits[i]*Renderer.ARENA_COLUMNS);
      this.playerA.shieldUniforms.uColumnValues.value[targetColumn] = 1;
    };

    function mirror(i) {
      return 1-i;
    }
  },

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

