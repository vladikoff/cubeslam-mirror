var settings = require('./settings')
  , world = require('./world');

module.exports = Renderer;

Renderer.EXTRA_EXTRABALL = "extraball";
Renderer.EXTRA_SPEEDBALL = "speedball";
Renderer.ARENA_COLUMNS = 18;

function Renderer(canvas){
  canvas.parentNode.className += ' renderer-3d';

  //constants can be set elsewhere. In that case, change in geometry-loader as well.
  this.iconTypes = [
    Renderer.EXTRA_EXTRABALL,
    Renderer.EXTRA_SPEEDBALL
  ]

  this.time = 0;
  this.initiated = false;
  this.inverted = false;
  this.globalTimeUniforms = [];
  this.shaderLibrary = {};
  this.geometryLibrary = {};
  this.materialLibrary = {};
  this.iconLibrary = {};
  this.canvas = canvas;
  this.puckMeshes = [];
  this.forceMeshes = [];
  this.paddleMeshes = [];
  this.obstacleMeshes = [];
  this.create();
}

function Player()  {
  this.cubeMesh = null;
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
    
    var camera = new THREE.PerspectiveCamera( 60, w/h, 10, 14000 );

    camera.position.x = 200;
    camera.position.y = 2220;
    camera.position.z = 0;

    this.cameraTarget = new THREE.Vector3(0,-300,0);
    camera.lookAt(this.cameraTarget);
    
    var scene = new THREE.Scene();

    var gameContainer = new THREE.Object3D();
    gameContainer.rotation.y = 0 
    scene.add(gameContainer);

    var renderer = new THREE.WebGLRenderer({canvas: this.canvas, antialias:true});
    renderer.sortObjects = false;
    renderer.setClearColorHex(0xe5e4c6,1)
    renderer.autoClear = true;
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

    scene.fog = new THREE.Fog( 0xe5e4c6, 5000, 10000 );

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.gameContainer = gameContainer;

    this.surfaceY = -200;
    this.videoInitiated = false;
   
    this.playerA = new Player();
    this.playerB = new Player();

    this.loadShaders();

  },


  loadShaders: function() {

    this.loadFiles( 
      ["javascript/simple_vertex.glsl",
       "javascript/shield_fs.glsl",
       "javascript/arena_fs.glsl",
       "javascript/arenaside_fs.glsl",
       "javascript/cpu_fs.glsl",
       "javascript/extraicon_vs.glsl",
       "javascript/extraicon_fs.glsl",

       //geometry
       "javascript/models/terrain1.js",
       "javascript/models/extra_plus.js"
       ]
    , function(result){
        var i=-1;
        this.shaderLibrary["simple_vs"] = result[++i];
        this.shaderLibrary["shield_fs"] = result[++i];
        this.shaderLibrary["arena_fs"] = result[++i];
        this.shaderLibrary["arenaside_fs"] = result[++i];
        this.shaderLibrary["cpu_fs"] = result[++i];
        this.shaderLibrary["extraicon_vs"] = result[++i];
        this.shaderLibrary["extraicon_fs"] = result[++i];
        
        this.geometryLibrary["terrain1"] = result[++i];

        //store icon geometry
        this.geometryLibrary[Renderer.EXTRA_EXTRABALL] = new THREE.GeometryLoader().parse(JSON.parse( result[++i] ));
        //just another icon with same geometry to test
        this.geometryLibrary[Renderer.EXTRA_SPEEDBALL] = this.geometryLibrary[Renderer.EXTRA_EXTRABALL] 
        
        this.init3D();

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

  //called after shaders and geometry finished loading
  init3D : function() {

        this.createMaterials();
        this.createIconLibrary();
        this.createPuck();
        this.createPaddles();
        this.createCubes();
        this.createLights();
        this.createArena();
        this.createShields();
        this.createTerrain();

        this.initAnimation();

        this.addIcon( Renderer.EXTRA_EXTRABALL);
        this.initiated = true;
  },

  //all materials is created here
  createMaterials: function(){
    var lib = this.materialLibrary;

    lib["obstacle"] = new THREE.MeshLambertMaterial({shading: THREE.FlatShading, color:0xffffff});
    lib["paddle"] = new THREE.MeshLambertMaterial({shading: THREE.FlatShading, color:0xffffff});

    var arenaSideMaterialWhite = new THREE.MeshLambertMaterial({color:0xe5e4c6}) 
    lib["arenaSideMaterials"] = [
      new THREE.MeshLambertMaterial({color:settings.data.arenaColor}),          // Left side
      arenaSideMaterialWhite,        // Right side
      arenaSideMaterialWhite,         // Top side
      arenaSideMaterialWhite,      // Bottom side
      arenaSideMaterialWhite,       // Front side
      arenaSideMaterialWhite         // Back side
    ]

    lib["arenaSideFaces"] = new THREE.MeshFaceMaterial();
    lib["centerLine"] = new THREE.MeshLambertMaterial({color:0xe5e4c6, side:THREE.DoubleSide})

    //arena grid    
    var gridTexture = THREE.ImageUtils.loadTexture( "images/grid.png" );
    gridTexture.mapping = THREE.UVMapping;
    gridTexture.anisotropy = this.renderer.getMaxAnisotropy();;
    gridTexture.minFilter = gridTexture.magFilter = THREE.LinearMipMapLinearFilter;
    gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;

    
    var uniforms = {
      tGrid: { type: "t", value: gridTexture},
      scale: { type: "v2", value: new THREE.Vector2(Renderer.ARENA_COLUMNS , 30 ) }
    }

    lib["arenaGrid"] = new THREE.ShaderMaterial({
      depthWrite:false,
      transparent:true,
      uniforms:  uniforms,
      vertexShader: this.shaderLibrary["simple_vs"],
      fragmentShader: this.shaderLibrary["arena_fs"]
    });
    lib["arenaGrid"].uniforms = uniforms

    lib["reflectionBox"] = new THREE.MeshBasicMaterial({color:0x000000, side:THREE.DoubleSide})

    //cube A
    lib["cubeFacesA"] = new THREE.MeshFaceMaterial();
    var cubeSideMaterial = new THREE.MeshPhongMaterial({color:0xe5e4c6})
    var videoMaterial = new THREE.MeshBasicMaterial({color:0x000000}) 
    lib["cubeA"] = [
      cubeSideMaterial,      // Left side
      cubeSideMaterial,      // Right side
      cubeSideMaterial,      // Top side
      cubeSideMaterial,      // Bottom side
      videoMaterial,         // Front side
      cubeSideMaterial       // Back side
    ]

    //cube B
    //init remote video texture
    lib["cubeFacesB"] = new THREE.MeshFaceMaterial();

    var uniforms2 = {
      time: { type: "f", value:0},
      resolution: { type: "v2", value:new THREE.Vector3(640,320)},
      mouse: { type: "v2", value:new THREE.Vector3(0.5,0.5)}
    }

    var cpuMaterial = new THREE.ShaderMaterial({
      transparent:true,
      uniforms:  uniforms2,
      vertexShader: this.shaderLibrary["simple_vs"],
      fragmentShader: this.shaderLibrary["cpu_fs"]
    });

    lib["cubeB"] = [
      cubeSideMaterial,        // Left side
      cubeSideMaterial,       // Right side
      cubeSideMaterial,     // Top side
      cubeSideMaterial,     // Bottom side
      cpuMaterial,     // Front side
      cubeSideMaterial         // Back side
    ]
    lib["cubeB"].uniforms = uniforms2;

    var videoMaterialTexture = new THREE.Texture(document.getElementById("remoteInput"));
    videoMaterialTexture.generateMipmaps = false;
    lib["remoteVideo"] = new THREE.MeshLambertMaterial({map:videoMaterialTexture})

    lib["terrainShadow"] = new THREE.MeshBasicMaterial({depthWrite:false,transparent:true, blending:THREE.MultiplyBlending, depthTest: true, map:THREE.ImageUtils.loadTexture( "images/radial_gradient_white.png" )})

    lib["treeBranches"] = new THREE.MeshLambertMaterial({color:0x0e64bb,shading: THREE.FlatShading});
    lib["treeTrunk"] = new THREE.MeshLambertMaterial({color:0x0c5ea7,shading: THREE.FlatShading})

  },

  createIconLibrary : function(){

    //get geometry and shaders and make icons 
    
    //change this when extra-list is refactored
    var tempColors = {
      "extraball": 0xe72921,
      "speedball": 0xffffff
    }

    for (var i = this.iconTypes.length - 1; i >= 0; i--) {
      var iconType = this.iconTypes[i];

      var iconMat = new THREE.ShaderMaterial({
        transparent:false,

        uniforms:  {
          color: { type: "c", value: new THREE.Color( tempColors[iconType]) },
          time: { type: "f", value: 0 }
        },
        vertexShader: this.shaderLibrary["extraicon_vs"],
        fragmentShader: this.shaderLibrary["extraicon_fs"],
        blending: THREE.AdditiveBlending,
        wireframe:false
      });

      //have to remove this when destroying mesh
      this.globalTimeUniforms.push(iconMat.uniforms.time)

      //get geometry
      var iconGeo = this.geometryLibrary[iconType];
      var iconMesh = new THREE.Mesh( iconGeo, iconMat) ;
      iconMesh.scale.set(4,4,4);
      iconMesh.position.y = this.surfaceY + 20;

      var iconMirrorMesh = new THREE.Mesh( iconGeo, iconMat) ;
      iconMirrorMesh.position.y = -20;
      iconMirrorMesh.scale.set(1,-1,1);
      iconMesh.add(iconMirrorMesh);

      iconMesh.material = iconMat;

      //store to library
      this.iconLibrary[iconType] = iconMesh;
    };

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


  // draw obstacles with THREE.Shape()
  // http://mrdoob.github.com/three.js/examples/webgl_geometry_shapes.html
  // and obstacle is a Polygon
  createObstacles: function(obstacle){

    var w = (world.bounds.r-world.bounds.l)
      , h = (world.bounds.b-world.bounds.t)

    var shape = new THREE.Shape();
    var v = obstacle.vertices[0];
    shape.moveTo(v.x*w,v.y*h);
    for( var i=1; i < obstacle.vertices.length; i++ ){
      v = obstacle.vertices[i];
      shape.lineTo(v.x*w,v.y*h);
    }

    var shapeGeo = new THREE.ExtrudeGeometry( shape, { amount: 40 } )
      , shapeMesh = new THREE.Mesh( shapeGeo, this.materialLibrary["obstacle"] );

    shapeMesh.rotation.x = Math.PI/2 // 90°
    shapeMesh.position.y = this.surfaceY+20;
    shapeMesh.position.x = -w/2;
    shapeMesh.position.z = -h/2;

    this.gameContainer.add(shapeMesh);
    this.obstacleMeshes.push(shapeMesh)

  },

  addIcon: function(icon) {

    //"icon" is just a label now

    var iconMesh = this.iconLibrary[icon]

    if( !iconMesh ) {
      console.warn("could not find icon with id: " + icon);
      return;
    }

    iconMesh.position.x = 0;
    iconMesh.position.z = 0;
    this.gameContainer.add(iconMesh);

  },

  removeIcon: function(icon) {
    if( this.iconLibrary[icon]) this.gameContainer.remove(this.iconLibrary[icon])
  },

  createPaddles: function(){

    var opponentPaddleGeo = new THREE.CubeGeometry( 100, 60, settings.data.paddleDepth )
      , opponentPaddle = new THREE.Mesh( opponentPaddleGeo, this.materialLibrary["paddle"] );
    
    opponentPaddle.position.y = this.surfaceY;
    this.gameContainer.add(opponentPaddle);

    var userPaddleGeo = new THREE.CubeGeometry( 100, 60, settings.data.paddleDepth )
      , userPaddle = new THREE.Mesh( userPaddleGeo, this.materialLibrary["paddle"] );
    
    userPaddle.position.y = this.surfaceY;
    this.gameContainer.add(userPaddle);

    this.paddleMeshes.push(opponentPaddle)
    this.paddleMeshes.push(userPaddle)
    this.obstacleMeshes.push(opponentPaddle)
    this.obstacleMeshes.push(userPaddle)
  },

  createLights: function(){

    var ambLight = new THREE.AmbientLight(0x222222,0);
    this.scene.add(ambLight)

    var hemLight = new THREE.HemisphereLight(0x000000, 0xeeeeee,0.6);
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
    dirLight.position.set( 0.5, .75, 0.5 );
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
      , sideH = settings.data.arenaSideHeight
      , boxDepth = settings.data.videoBoxDepth
       
      
    //boundingbox
    var arenaBottomGeo = new THREE.PlaneGeometry(w,d,1,1)
    var transArenaMaterial = new THREE.MeshPhongMaterial({color:settings.data.arenaColor, opacity:0.8,transparent:true,depthWrite:false})
    this.arenaBottomMesh = new THREE.Mesh( arenaBottomGeo, transArenaMaterial );
    this.arenaBottomMesh.rotation.x = Math.PI*1.5;
    this.arenaBottomMesh.position.y = this.surfaceY;
    this.gameContainer.add(this.arenaBottomMesh);

    var arenaSideGeo = new THREE.CubeGeometry(10,sideH,d,1,1,1,this.materialLibrary["arenaSideMaterials"]);

    var arenaRightMesh = new THREE.Mesh( arenaSideGeo, this.materialLibrary["arenaSideFaces"] );
    arenaRightMesh.position.x = hw;
    arenaRightMesh.position.y = this.surfaceY+sideH*.5
    arenaRightMesh.rotation.y = Math.PI;
    this.gameContainer.add(arenaRightMesh);
    this.arenaRightMesh = arenaRightMesh;

    var arenaLeftMesh = new THREE.Mesh( arenaSideGeo, this.materialLibrary["arenaSideFaces"] );
    arenaLeftMesh.position.x = -hw;
    arenaLeftMesh.position.y = this.surfaceY+sideH*.5;
    this.gameContainer.add(arenaLeftMesh);
    this.arenaLeftMesh = arenaLeftMesh;

    var centerLineGeo = new THREE.PlaneGeometry(18,sideH+1,1,1 );
    var centerLineMesh = new THREE.Mesh(centerLineGeo,this.materialLibrary["centerLine"])
    centerLineMesh.position.x = 5.2;
    centerLineMesh.rotation.y = Math.PI*.5;
    arenaLeftMesh.add(centerLineMesh);

    var centerLineMesh2 = new THREE.Mesh(centerLineGeo,this.materialLibrary["centerLine"]);
    centerLineMesh2.position.x = 5.2;
    centerLineMesh2.rotation.y = -Math.PI*.5;
    arenaRightMesh.add(centerLineMesh2);

    //table

    var table = new THREE.Mesh( new THREE.PlaneGeometry(w,d,1,1), this.materialLibrary["arenaGrid"] );
    table.rotation.x = -Math.PI*.5
    table.position.y = this.surfaceY+2;
    this.gameContainer.add(table);

    var reflectionBoxGeo = new THREE.CubeGeometry(w,200,d,1,1,1,null, { px: true, nx: true, py: false, ny: true, pz: true, nz: true });
    var blackBottomMesh = new THREE.Mesh( reflectionBoxGeo, this.materialLibrary["reflectionBox"] );
    blackBottomMesh.position.y = this.surfaceY-100;
    this.gameContainer.add(blackBottomMesh);

    
  },

  createCubes: function(){

    var w = settings.data.arenaWidth
      , hw = w*.5 
      , h = w/16*9//-this.surfaceY//this.bounds.b-this.bounds.t+this.puckRadius*2
      , hh = h*0.5//-this.surfaceY//this.bounds.b-this.bounds.t+this.puckRadius*2
      , d = settings.data.arenaHeight // NOTE: adjusting depth requires moving the camera+
      , hd = d*.5
      , arenaPosZ = 0//;d*.5
      , sideH = settings.data.arenaSideHeight
      , boxDepth = settings.data.videoBoxDepth

    //video cubes
   
    var cubeA = new THREE.Mesh( new THREE.CubeGeometry(w,h,settings.data.videoBoxDepth,1,1,1, this.materialLibrary["cubeA"]), this.materialLibrary["cubeFacesA"]  );
    cubeA.position.set( 0,this.surfaceY - hh + sideH,(hd+settings.data.videoBoxDepth*.5+2));
    this.playerA.cubeUpY = this.surfaceY + hh;
    this.playerA.cubeDownY = this.surfaceY - hh
    this.playerA.cubeMesh = cubeA;
    this.gameContainer.add(cubeA);


    var cubeB = new THREE.Mesh( new THREE.CubeGeometry(w,h,settings.data.videoBoxDepth,1,1,1,this.materialLibrary["cubeB"]), this.materialLibrary["cubeFacesB"]  );
    cubeB.position.set(0, this.surfaceY - hh, (-hd-settings.data.videoBoxDepth*.5-1) );
    this.playerB.cubeUpY = this.surfaceY + hh;
    this.playerB.cubeDownY = this.surfaceY - hh

    
    //this.playerB.cubeVideoMaterial = videoMaterial2;
    //this.playerB.cubeCpuMaterial = cpuMaterial;

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
      , sideH = settings.data.arenaSideHeight;

     var shieldGeo = new THREE.CubeGeometry(w,sideH,8,1,1,1,null, { px: false, nx: false, py: true, ny: false, pz: true, nz: true });

    var shieldMesh = new THREE.Mesh( shieldGeo, new THREE.ShaderMaterial({blending:THREE.NormalBlending,transparent:true,uniforms:this.playerA.shieldUniforms,vertexShader: this.shaderLibrary["simple_vs"],fragmentShader: this.shaderLibrary["shield_fs"]}));
    shieldMesh.position.y = this.surfaceY+sideH*.5;    shieldMesh.position.z = hd-3;
    this.playerA.shieldMesh = shieldMesh
    this.gameContainer.add(shieldMesh);

    shieldMesh = new THREE.Mesh( shieldGeo, new THREE.ShaderMaterial({blending:THREE.NormalBlending,transparent:true,uniforms:  this.playerB.shieldUniforms,vertexShader: this.shaderLibrary["simple_vs"],fragmentShader: this.shaderLibrary["shield_fs"]}));
    shieldMesh.position.y = this.surfaceY+sideH*.5;
    shieldMesh.position.z = -hd+15;
    this.playerB.shieldMesh = shieldMesh
    this.gameContainer.add(shieldMesh);
  },

  createTerrain: function(){
      
      var data = JSON.parse( this.geometryLibrary["terrain1"] );
      var geometry = new THREE.GeometryLoader().parse(data)

      //close terrain      
      var noise = new SimplexNoise()
      , len = geometry.vertices.length
      , h = 1000
      , n = 0;
      //offset and change color
      for (var i = 0; i < len; i++) {
        
        var point = geometry.vertices[i]

        var uvY = 1-((point.z / 5000) + 0.5);
        var uvX = point.x/3000

        n = noise.noise(uvX *2*2, uvY*2 )//+ noise.noise(point.x / 2000 *3, point.y / w*.5 * 14) * uvX;
        n = Math.abs(n);
        
        point.y = n * 200 * (Math.abs(uvX*uvX)) * (uvY) - (uvY+0.3)*400// + n*400*((1-Math.abs(uvX))*(uvY))

        //attach edge to arena
        if( i == 43 || i == 51 || i ==35 || i == 27 ) {
          point.x = settings.data.arenaWidth*-.5-5;
          point.y = this.surfaceY+settings.data.arenaSideHeight;
        }
        else if( i ==28 || i == 37 || i==45 || i == 53   ) {
          point.x = settings.data.arenaWidth*.5+5;  
          point.y = this.surfaceY+settings.data.arenaSideHeight;
        }
      }

      geometry.computeFaceNormals();

      var terrainMat = new THREE.MeshLambertMaterial( {color:0x1a99db, wireframe:false, shading:THREE.FlatShading });
      var terrainMesh = new THREE.Mesh(geometry,terrainMat)

      //terrainMesh.scale.set(0.5,1,1)
      terrainMesh.position.z = 0;
      //terrainMesh.position.y = this.surfaceY+settings.data.arenaSideHeight;

     this.gameContainer.add(terrainMesh);

      //distant terrain

      terrainMesh = this.createTerrainMesh(6000,2000,2205,20,20,new THREE.Color( 0x20759c ),1.4,false)
      terrainMesh.position.z = -6500;
      terrainMesh.position.x = Math.random()*5000-2500;
      terrainMesh.position.y = this.surfaceY-settings.data.arenaSideHeight;
      terrainMesh.scale.x = 4;
      terrainMesh.scale.y = 4;
      this.gameContainer.add(terrainMesh);

      terrainMesh = this.createTerrainMesh(4000,3000,8205,10,10,new THREE.Color( 0x184d6f ),1,false)
      terrainMesh.position.z = -5000;
      terrainMesh.position.x = Math.random()*5000-2500;
      terrainMesh.position.y = this.surfaceY-settings.data.arenaSideHeight;
      terrainMesh.scale.x = 3;

      this.gameContainer.add(terrainMesh);

      this.createForrest()

  },

  createTerrainMesh : function( w, h, extrude, segW, segH, baseColor, noiseFactor, bValley ){
      var noise = new SimplexNoise()
      , n = 0
      , faceIndices = [ 'a', 'b', 'c', 'd' ]
      , newColor = null
      , geometry = new THREE.PlaneGeometry(w,h,segW,segH)
      , len = geometry.vertices.length
      , hsvColor = baseColor.getHSV()

      //offset and change color
      for (var i = 0; i < len; i++) {
        
        var point = geometry.vertices[i]

        point.x += Math.random()*20;
        point.y += (Math.random()*20);

        var uvY = 1-((point.y / h) + 0.5);
        var uvX = point.x/w

        n = noise.noise(uvX *noiseFactor*2, uvY*noiseFactor )//+ noise.noise(point.x / 2000 *3, point.y / w*.5 * 14) * uvX;
        n = Math.abs(n);
        
        if( bValley ) {
          point.z = n * extrude*2 * (Math.abs(uvX*uvX))*2 * (1-uvY)// + n*400*((1-Math.abs(uvX))*(uvY))
        }
        else {
          point.z = n * extrude * Math.max(0,(1-uvY)-0.1)*(0.5-Math.abs(uvX))*2 // + n*400*((1-Math.abs(uvX))*(uvY))  
        }
      }

      geometry.computeFaceNormals();
      
      var natureMaterial = new THREE.MeshLambertMaterial( {color:baseColor, wireframe:false, shading:THREE.FlatShading })
      var mountainMesh = new THREE.Mesh(geometry, natureMaterial)

      mountainMesh.rotation.x = Math.PI*-.5
      
      return mountainMesh;

  },

  createForrest : function() {

    var trunkGeo = new THREE.CubeGeometry(20,100,10,1,1,1);
    var shapeGeo = new THREE.CylinderGeometry( 0, 80, 220, 4, 1 );
    var shadowPlaneGeo = new THREE.PlaneGeometry( 200,200,1,1);
    

    for ( var i = 0; i < 70; i ++ ) {

      var shapeMesh = new THREE.Mesh( shapeGeo, this.materialLibrary["treeBranches"] );
      shapeMesh.rotation.y = Math.PI*-.5;
      shapeMesh.position.y = 90;

      var trunkMesh = new THREE.Mesh( trunkGeo, this.materialLibrary["treeTrunk"] );
      trunkMesh.add(shapeMesh)
      trunkMesh.position.x = ( 1000 + Math.random() * 2000)*((Math.random()>.5)?-1:1);
      trunkMesh.position.y = this.surfaceY//( Math.random() - 0.5 ) * 1000;
      trunkMesh.position.z = -1000 + ( Math.random() - 0.5 ) * 2000;
      trunkMesh.updateMatrix();
      
      var scale = 0.7+Math.random()*0.7;
      trunkMesh.rotation.y = Math.random()
      trunkMesh.scale.set(scale,scale,scale)

      //shadow
      
      var shadowMesh = new THREE.Mesh( shadowPlaneGeo, this.materialLibrary["terrainShadow"] );
      shadowMesh.position.y = -50 //Math.random()*10;
      shadowMesh.rotation.x = -Math.PI*0.5;
      trunkMesh.add(shadowMesh);

      this.gameContainer.add(trunkMesh);

    }
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
      .delay(1000)
      .to({y:420,z:1700,x:0},2400)
      .onUpdate( function(){
        scope.camera.lookAt(scope.cameraTarget);
      })
      .start();

  },

  render: function(world, alpha){

    if(!this.initiated) return;

    //update all time-parameters in active shader-materials
    for (var i = this.globalTimeUniforms.length - 1; i >= 0; i--) {
      this.globalTimeUniforms[i].value += 0.03
    };
    

    // TODO instead of world.bounds we should probably just use settings?
    var fw = (world.bounds.r-world.bounds.l)
      , fh = (world.bounds.b-world.bounds.t)
      , hw = fw/2
      , hh = fh/2;

    if( this.playerA.shieldUniforms.uBrightness.value > 0.15 ) 
      this.playerA.shieldUniforms.uBrightness.value *= 0.97;
    if( this.playerB.shieldUniforms.uBrightness.value > 0.15 ) 
      this.playerB.shieldUniforms.uBrightness.value *= 0.97;

    // update colors (move this to level change or settings change)
    if( this.arenaBottomMesh.material.color.getHex() != settings.data.arenaColor) {
      this.arenaBottomMesh.material.color.setHex( settings.data.arenaColor );
      this.materialLibrary["arenaSideMaterials"][0].color.setHex( settings.data.arenaColor );
    }

    if( settings.data.puckColor != this.playerA.shieldUniforms.uColor.value) {
        this.playerA.shieldUniforms.uColor.value = new THREE.Color( settings.data.puckColor )
        this.playerB.shieldUniforms.uColor.value = new THREE.Color( settings.data.puckColor )
    }
    
    // Create any new forces
    for(var i=this.forceMeshes.length; i < world.forces.length; i++ ) {
      this.createForce(world.forces[i]);
    }

    // Create any new obstacles (refactor this to not be in each render step?)
    for(var i=this.obstacleMeshes.length; i < world.obstacles.length; i++ ) {
      this.createObstacles(world.obstacles[i]);
    }
      
    // Create any new pucks (refactor this to not be in each render step?)
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
      this.materialLibrary["cubeB"].uniforms.mouse.value.x = puck.current.x;
      this.materialLibrary["cubeB"].uniforms.mouse.value.y = puck.current.y;
      this.materialLibrary["cubeB"].uniforms.time.value += 0.01;

      if( mesh.material.color.getHex() != settings.data.puckColor) {
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

    // Update video texture in 2p mode
    var tex = this.materialLibrary["remoteVideo"].map;
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

  swapToVideoTexture : function() {

    var scope = this;
      var anim = new TWEEN.Tween(this.playerB.cubeMesh.position)
        .to( { y:  this.playerB.cubeDownY}, 500 )
        .onComplete(function(){

          scope.playerB.cubeMesh.geometry.materials[4] = this.materialLibrary["remoteVideo"];

          var anim2 = new TWEEN.Tween(scope.playerB.cubeMesh.position)
          .to( { y:  scope.playerB.cubeUpY}, 1000 )
          .start();

        })
        .start();

    
  }
}

