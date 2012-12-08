var settings = require('../settings')
  , Geometry = require('../geometry')
  , ImprovedNoise = require('./improved-noise')
  , debug = require('debug')('renderer:3d:env')
  , ObjectPool = require('./object-pool')
  , extras = require('../extras')
  , Materials = require('./materials');

module.exports = Environment;

// Environment
//   - center // used with camera.lookAt(this.env.center)
//   - terrain
//   - forrest
//   - arena
//   - extras[]
//   - forces[]
//   - lights[]
//   - pucks[]
//   #update(world)

function Environment(renderer){
  debug('new')
  // used as camera.lookAt(this.env.center)
  this.center = new THREE.Vector3(0,0,0);
  this.arena = createArena(renderer)

  this.terrain = createTerrain(renderer)
  this.clouds = createClouds(this.terrain)
  //this.paddleSetup = createPaddleSetup(renderer,this.terrain)
  //this.paddleSetupSymbol = createPaddleSetupSymbol(renderer,this.paddleSetup)
  this.lights = createLights(this.terrain)
  this.icons = createIcons(renderer)
  this.extras = []
  this.obstacles = []
  this.forces = []
  this.pucks = []
  this.bodies = {};
}

Environment.prototype = {

  reset: function(){
    debug('reset')

    // remove all forces/extras/pucks
    while(this.pucks.length)
      removePuck(this.pucks.pop());
    while(this.forces.length)
      removeForce(this.forces.pop());
    while(this.extras.length)
      removeExtra(this.extras.pop());
    while(this.obstacles.length)
      removeExtra(this.obstacles.pop());
  },


  update: function(world,alpha){
    // TODO pool pucks/forces/extras, or at least pre-instantiate

    var w = settings.data.arenaWidth
      , h = settings.data.arenaHeight
      , hw = w*.5
      , hh = h*.5;

    // remove bodies
    // TODO use linked lists instead of push/splice
    while(world.remove.length){
      var body = world.remove.pop()
        , obj = this.bodies[body.index]
        , i;

      if( (i=this.pucks.indexOf(obj)) !== -1 ){
        removePuck(obj);
        this.pucks.splice(i,1);
      }

      else if( (i=this.forces.indexOf(obj)) !== -1 ){
        removeForce(obj);
        this.forces.splice(i,1);
      }

      else if( (i=this.extras.indexOf(obj)) !== -1 ){
        removeExtra(obj);
        this.extras.splice(i,1);
      }

      else if( (i=this.obstacles.indexOf(obj)) !== -1 ){
        removeExtra(obj);
        this.obstacles.splice(i,1);
      }

      else
        console.warn('supposed to remove',body,obj)

      this.bodies[body.index] = null;
    }


    // create pucks
    for(var i=this.pucks.length; i < world.pucks.length; i++ ){
      var body = world.pucks[i];
      var obj = createPuck(this.arena, body)
      this.pucks.push(obj)
      this.bodies[body.index] = obj;
    }

    // create forces
    for(var i=this.forces.length; i < world.forces.length; i++ ){
      var body = world.forces[i];
      var obj = createForce(this.arena, world, body)
      this.forces.push(obj)
      this.bodies[body.index] = obj;
    }

    // create extras
    for(var i=this.extras.length; i < world.extras.length; i++ ){
      var body = world.extras[i];
      var obj = createExtra(this.arena, world, this.icons, body)
      this.extras.push(obj)
      this.bodies[body.index] = obj;
    }

    // create obstacles
    for(var i=this.obstacles.length; i < world.obstacles.length; i++ ){
      var body = world.obstacles[i];
      var obj = createExtra(this.arena, world, this.icons, body)
      this.obstacles.push(obj)
      this.bodies[body.index] = obj;
    }

    // update pucks
    for(var i=0; i < world.pucks.length; i++){
      var puck = world.pucks[i]
        , mesh = this.pucks[i];
      mesh.position.x -= (mesh.position.x - (puck.current[0] - hw)) / 2;
      mesh.position.z -= (mesh.position.z - (puck.current[1] - hh)) / 2;
      mesh.scale.x = (puck.aabb[1] - puck.aabb[3])/100
      mesh.scale.z = (puck.aabb[2] - puck.aabb[0])/100

      if( mesh.material.color.getHex() != settings.level.theme.puckColor)
        mesh.material.color.setHex( settings.level.theme.puckColor );
    }

  }

}

function createPaddleSetup(renderer,terrain){
  debug('create paddle setup')

  var geo = new THREE.CubeGeometry(900,675,50,1,1,1,Materials.paddleSetupBox);
  var paddleSetupBox = new THREE.Mesh( geo, new THREE.MeshFaceMaterial());
  paddleSetupBox.name = 'paddleSetupBox'
  paddleSetupBox.position.set(-2000,100,470)
  paddleSetupBox.rotation.y = Math.PI*-.10;
  terrain.add(paddleSetupBox)

  var foundationGeo = new THREE.CubeGeometry(960,200,110,1,1,1);
  var foundationMesh = new THREE.Mesh(foundationGeo,Materials.arenaSideColorMaterial)
  foundationMesh.name = 'foundationMesh'
  foundationMesh.position.set(-2000,-80,470)
  foundationMesh.rotation.y = Math.PI*-.10;
  terrain.add(foundationMesh)

  var colorPreviewGeo = new THREE.CubeGeometry(140,140,140,1,1,1);
  var colorPreviewBox = new THREE.Mesh(colorPreviewGeo,Materials.colorPreview)
  colorPreviewBox.name = 'colorPreviewBox'
  colorPreviewBox.position.set(-2300,0,670)
  terrain.add(colorPreviewBox);

  return paddleSetupBox;
}

function createPaddleSetupSymbol(renderer, paddleSetupBox){
  debug('create paddle setup symbol')

  var symbolsGeo = new THREE.PlaneGeometry(100,100,1,1);
  var symbolsMesh = new THREE.Mesh(symbolsGeo, Materials.scanSymbols )
  symbolsMesh.material.map.repeat = new THREE.Vector2(0.25,0.25);
  symbolsMesh.material.map.offset = new THREE.Vector2(0.25,0.75);
  symbolsMesh.position.z = 26
  symbolsMesh.position.y = (675*.8 - 675*.5)*-1 + 35
  paddleSetupBox.add(symbolsMesh);

  var decalGeo = new THREE.PlaneGeometry(150,150,1,1);
  labelMesh = new THREE.Mesh(decalGeo, Materials.paddleSetupDecal )
  labelMesh.material.map.repeat = new THREE.Vector2(0.25,0.25);
  labelMesh.material.map.offset = new THREE.Vector2(0.25,0.5);

  labelMesh.position.z = 26
  labelMesh.position.x = 340
  labelMesh.position.y = 350 - 100
  paddleSetupBox.add(labelMesh);

  return symbolsMesh;
}


function createArena(renderer){
  debug('create arena')
  var w = settings.data.arenaWidth
    , h = w/16*9
    , hw = w*.5
    , hh = h*.5
    , d = settings.data.arenaHeight
    , sideH = settings.data.arenaSideHeight
    , boxDepth = settings.data.videoBoxDepth

  var arena = new THREE.Object3D();
  arena.name = 'arena'
  arena.position.y = settings.data.arenaSurfaceY;
  renderer.container.add(arena);


  // boundingbox
  var bottomGeo = new THREE.PlaneGeometry(w,d,1,1)
    , bottomMesh = new THREE.Mesh( bottomGeo, Materials.arenaTransMaterial );

  bottomMesh.rotation.x = Math.PI*1.5;
  arena.add(bottomMesh);
  arena.bottomMesh = bottomMesh;

  var sideGeo = new THREE.CubeGeometry(10,sideH,d,1,1,1,Materials.arenaSideMaterials);

  var rightMesh = new THREE.Mesh(sideGeo, Materials.arenaSideFaces );
  rightMesh.position.x = hw;
  rightMesh.position.y = sideH*.5
  rightMesh.rotation.y = Math.PI;
  arena.add(rightMesh);
  arena.rightMesh = rightMesh;

  var leftMesh = new THREE.Mesh(sideGeo, Materials.arenaSideFaces);
  leftMesh.position.x = -hw;
  leftMesh.position.y = sideH*.5;
  arena.add(leftMesh);
  arena.leftMesh = leftMesh;

  //construct pit walls

  var sideGeoPart = new THREE.CubeGeometry(10,sideH,boxDepth,1,1,1);
  var finalGeo = new THREE.Geometry();

  //a:left wall
  var tempMesh = new THREE.Mesh(sideGeoPart, Materials.arenaBorder );
  tempMesh.position.set(-hw,sideH*.5,d*.5+boxDepth*.5)
  THREE.GeometryUtils.merge(finalGeo, tempMesh);

  //a:right wall
  tempMesh.position.set(hw,sideH*.5,d*.5+boxDepth*.5)
  THREE.GeometryUtils.merge(finalGeo, tempMesh);

  //b:left wall
  tempMesh.position.set(-hw,sideH*.5,-d*.5-boxDepth*.5)
  THREE.GeometryUtils.merge(finalGeo, tempMesh);

  //b:right wall
  tempMesh.position.set(hw,sideH*.5,-d*.5-boxDepth*.5)
  THREE.GeometryUtils.merge(finalGeo, tempMesh);

  var bottomGeoPart = new THREE.CubeGeometry(w,sideH,10,1,1,1);
  //a:bottom wall
  tempMesh = new THREE.Mesh(bottomGeoPart, Materials.arenaBorder );
  tempMesh.position.set(0,sideH*.5,d*.5+boxDepth)
  THREE.GeometryUtils.merge(finalGeo, tempMesh);

  //b:bottom wall
  tempMesh = new THREE.Mesh(bottomGeoPart, Materials.arenaBorder );
  tempMesh.position.set(0,sideH*.5,-d*.5-boxDepth)
  THREE.GeometryUtils.merge(finalGeo, tempMesh);

  var finalMesh = new THREE.Mesh(finalGeo, Materials.arenaBorder );
  arena.add(finalMesh);


  var centerLineGeo = new THREE.PlaneGeometry(18,sideH+1,1,1 );
  var centerLineMesh = new THREE.Mesh(centerLineGeo,Materials.centerLine)
  centerLineMesh.position.x = 5.2;
  centerLineMesh.rotation.y = Math.PI*.5;
  arena.leftMesh.add(centerLineMesh);

  var centerLineMesh2 = new THREE.Mesh(centerLineGeo,Materials.centerLine);
  centerLineMesh2.position.x = 5.2;
  centerLineMesh2.rotation.y = -Math.PI*.5;
  arena.rightMesh.add(centerLineMesh2);

  //table
  var table = new THREE.Mesh( new THREE.PlaneGeometry(w,d,1,1), Materials.arenaGrid);
  table.rotation.x = -Math.PI*.5
  table.position.y = 2;
  arena.add(table);

  var reflectionBoxGeo = new THREE.CubeGeometry(w,1000,d,1,1,1,null, { px: true, nx: true, py: false, ny: true, pz: true, nz: true });
  var blackBottomMesh = new THREE.Mesh( reflectionBoxGeo, Materials.reflectionBox);
  blackBottomMesh.position.y = -500;
  arena.add(blackBottomMesh);

  return arena;
}


function createLights(terrain){
  debug('create lights')
  var lights = [];
/*
  var ambLight = new THREE.AmbientLight(0x222222,0);
  terrain.add(ambLight)
  lights.push(ambLight)
*/
  //var hemLight = new THREE.HemisphereLight(0xe5e4c6, 0xeeeeee,0.6);
  var hemLight = new THREE.HemisphereLight(settings.data.hemisphereLightSkyColor, settings.data.hemisphereLightGroundColor,settings.data.hemisphereLightIntensity);
  terrain.add(hemLight)
  lights.push(hemLight)

  var pointLight = new THREE.PointLight( settings.data.pointLightColor,settings.data.pointLightIntensity,2000 );
  pointLight.position = new THREE.Vector3(0,400,0);
  //terrain.add(pointLight);
  //lights.push(pointLight)

  var dirLight = new THREE.DirectionalLight(settings.data.dirlightColor,settings.data.dirLightIntensity);
  dirLight.color.setHSV( 0.1, 0.1, 1 );
  dirLight.position.set( 0, 1, 0.5 );
  dirLight.position.multiplyScalar( 50 );
  terrain.add(dirLight);
  lights.push(dirLight)

  settings.emitter.on("lightsUpdated", function(){

    dirLight.color.setHex(settings.data.dirLightColor);
    dirLight.intensity = settings.data.dirLightIntensity;
    pointLight.color.setHex(settings.data.pointLightColor);
    pointLight.intensity = settings.data.pointLightIntensity;
    hemLight.color.setHex(settings.data.hemisphereLightSkyColor);
    hemLight.groundColor.setHex(settings.data.hemisphereLightGroundColor);
    hemLight.intensity = settings.data.hemisphereLightIntensity;

  }.bind(this))

  return lights;
}


function createTerrain(renderer){
  debug('create terrain')
  var geometry = Geometry.terrain1;
  geometry.mergeVertices();
  // close terrain
  var noise = null//new SimplexNoise()
    , len = geometry.vertices.length
    , h = 1000
    , n = 0
    , arenaW = settings.data.arenaWidth
    , arenaH = settings.data.arenaHeight;

  // offset and change color
  for (var i = 0; i < len; i++) {
    var point = geometry.vertices[i]

    var uvY = 1-((point.z / 4500) + 0.5);
    var uvX = point.x/3000

   /* n = noise.noise(uvX *2*2, uvY*2 )//+ noise.noise(point.x / 2000 *3, point.y / w*.5 * 14) * uvX;
    n = Math.abs(n);

    point.y = n * 200 * (Math.abs(uvX*uvX)) * (uvY) - (uvY+0.3)*400// + n*400*((1-Math.abs(uvX))*(uvY))
*/
    point.y -= -50 + 100*uvY;
    // attach edge to left/right of arena
    if( i == 43 || i == 51 || i ==35 || i == 27 ) {
      point.x = arenaW*-.5-5;
      point.y = settings.data.arenaSurfaceY+settings.data.arenaSideHeight;
    }
    else if( i ==28 || i == 37 || i==45 || i == 53  ) {
      point.x = arenaW*.5+5;
      point.y = settings.data.arenaSurfaceY+settings.data.arenaSideHeight;
    }

    if(i == 105) {
      point.y = settings.data.arenaSurfaceY+settings.data.arenaSideHeight;
    }

    //set z-points to edge
    if( i == 28 || i == 27 || i == 105) {
      point.z = arenaH*.5 + settings.data.videoBoxDepth+5;
    }
    else if(i==51 || i == 53) {
      point.z = -arenaH*.5 - settings.data.videoBoxDepth-5;
    }
  }

  geometry.computeFaceNormals();
  geometry.computeCentroids();

  var terrain = new THREE.Object3D();
  terrain.name = 'terrain'
  renderer.container.add(terrain);

  var terrainMesh = new THREE.Mesh(geometry,Materials.terrain1)
  terrainMesh.position.z = 0;
  terrain.terrainShortcut = terrainMesh;
  terrain.add(terrainMesh);

  //distant terrain
  terrainMesh = createTerrainMesh(6000,2000,2505,20,3,new THREE.Color( 0x1f84d5),4,false, Materials.terrain2)
  terrainMesh.position.z = -6500;
  terrainMesh.position.x = Math.random()*5000-2500;
  terrainMesh.position.y = settings.data.arenaSurfaceY-settings.data.arenaSideHeight;
  terrainMesh.scale.x = 4;
  terrainMesh.scale.y = 4;
  terrain.add(terrainMesh);

  terrainMesh = createTerrainMesh(4000,3000,8505,20,5,new THREE.Color( 0x195475 ),4,false, Materials.terrain3)
  terrainMesh.position.z = -6500;
  terrainMesh.position.x = Math.random()*5000-2500;
  terrainMesh.position.y = settings.data.arenaSurfaceY-settings.data.arenaSideHeight - 500;
  terrainMesh.scale.x = 4;
  terrainMesh.scale.y = 2;
  terrain.add(terrainMesh);

  createForrest(renderer,terrain)

  return terrain;
}



function createTerrainMesh( w, h, extrude, segW, segH, baseColor, noiseFactor, bValley, material ){

  var n = 0
    , faceIndices = [ 'a', 'b', 'c', 'd' ]
    , newColor = null
    , geometry = new THREE.PlaneGeometry(w,h,segW,segH)
    , len = geometry.vertices.length;

  // offset and change color
  var freq = 50;
  var z = Math.random() * 10;

  for (var i = 0; i < len; i++) {
    var point = geometry.vertices[i]
    point.x += Math.random()*60;
    point.y += Math.random()*120-60;

    var uvY = 1-((point.y / h) + 0.5);
    var uvX = point.x/w

    n = ImprovedNoise.noise((uvX+0.5)*noiseFactor, uvY*noiseFactor, z ) + ImprovedNoise.noise((uvX+0.5)*noiseFactor*3, uvY*noiseFactor*3, 0 )*0.2
    n = Math.abs(n);

    if( bValley ) {
      point.z = n * extrude * (Math.abs(uvX*uvX))*2 * (1-uvY) + n*400*((1-Math.abs(uvX))*(uvY))
    }
    else {
      point.z = n * extrude * Math.max(0,(1-uvY)-0.1)*(0.5-Math.abs(uvX))*2 // + n*400*((1-Math.abs(uvX))*(uvY))
    }

    point.z += Math.random()*220;
  }

  geometry.computeFaceNormals();

  var mountainMesh = new THREE.Mesh(geometry, material)
  mountainMesh.rotation.x = Math.PI*-.5
  return mountainMesh;
}


function createForrest(renderer,terrain) {
  debug('create forrest');
  var mergeGeometry = new THREE.Geometry();
  var mergeShadowGeometry = new THREE.Geometry();

  var trunkGeo = new THREE.CubeGeometry(20,100,10,1,1,1);
  trunkGeo.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(0, 50, 0)));
  var shapeGeo = new THREE.CylinderGeometry( 0, 80, 220, 4, 1 );
  shapeGeo.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(0, 140, 0)));
  var shadowPlaneGeo = new THREE.PlaneGeometry( 200,200,1,1);

  //temp meshes
  var trunkMesh = new THREE.Mesh( trunkGeo,null );
  var shapeMesh = new THREE.Mesh( shapeGeo, null );
  var shadowMesh = new THREE.Mesh( shadowPlaneGeo, null );


  var gridX = 100;
  var gridY = 100;

  for (var px = gridX - 1; px >= 0; px--) {
    for (var py = gridY - 1; py >= 0; py--) {
      var uvX = px/gridX - .5;
      var uvY = py/gridY - .5;

      //TODO Prevent trees to grow at the paddle-setup-screen

      if( (uvX > -0.2 && uvX < 0.2 && uvY > -0.4 && uvY < 0.4) || (uvX < 0 && uvY > 0) ) continue;


      var n = ImprovedNoise.noise((uvX+0.5)*5, (uvY+0.5)*5,Math.random()*10 );

      if( n >= 0.4) {

        var scale = (n*n)*1.5+0.3;

        var newPosition = new THREE.Vector3(uvX*6000 +Math.random()*100,500,uvY*6000+Math.random()*100);

        //shoot ray to find y
        var ray = new THREE.Ray( newPosition, new THREE.Vector3(0, -1, 0));
        var intersects = ray.intersectObject(terrain.terrainShortcut);

        //find intersection with terrain
        if ( intersects.length > 0 ) {
          newPosition = intersects[0].point.clone().addSelf( new THREE.Vector3(0,10,0));
        }

        trunkMesh.rotation.y = Math.random()*Math.PI*2
        trunkMesh.scale.set(scale,scale,scale)
        trunkMesh.position = newPosition
        THREE.GeometryUtils.merge(mergeGeometry,trunkMesh);

        shapeMesh.rotation.y = Math.random();
        shapeMesh.position = newPosition
        shapeMesh.scale.set(scale,scale,scale)
        THREE.GeometryUtils.merge(mergeGeometry,shapeMesh);

        shadowMesh.position = newPosition
        shadowMesh.scale.set(scale,scale,scale)
        shadowMesh.rotation.x = -Math.PI*0.5;
        THREE.GeometryUtils.merge(mergeShadowGeometry,shadowMesh);

      }
    };
  };

  //add static trees
  var treeList = [
    {x:-0.2,y:0.2,scale:1},
    {x:-0.3,y:0.25,scale:0.8},
    {x:-0.5,y:0.1,scale:0.8},
    {x:-0.45,y:0.1,scale:1.2},
    {x:-0.40,y:0.3,scale:1},
    {x:-0.45,y:0.3,scale:1.2}
  ];



  for (var i = treeList.length - 1; i >= 0; i--) {
    var uvX = treeList[i].x
    var uvY = treeList[i].y

    //TODO Prevent trees to grow at the paddle-setup-screen

    var scale = treeList[i].scale
    var newPosition = new THREE.Vector3(uvX*6000 +Math.random()*100,500,uvY*6000+Math.random()*100);

    //shoot ray to find y
    var ray = new THREE.Ray( newPosition, new THREE.Vector3(0, -1, 0));
    var intersects = ray.intersectObject(terrain.terrainShortcut);

    //find intersection with terrain
    if ( intersects.length > 0 ) {
      newPosition = intersects[0].point.clone().addSelf( new THREE.Vector3(0,10,0));
    }

    trunkMesh.rotation.y = Math.random()*Math.PI*2
    trunkMesh.scale.set(scale,scale,scale)
    trunkMesh.position = newPosition
    THREE.GeometryUtils.merge(mergeGeometry,trunkMesh);

    shapeMesh.rotation.y = Math.random();
    shapeMesh.position = newPosition
    shapeMesh.scale.set(scale,scale,scale)
    THREE.GeometryUtils.merge(mergeGeometry,shapeMesh);

    shadowMesh.position = newPosition
    shadowMesh.scale.set(scale,scale,scale)
    shadowMesh.rotation.x = -Math.PI*0.5;
    THREE.GeometryUtils.merge(mergeShadowGeometry,shadowMesh);

 };


  var forrestMesh = new THREE.Mesh(mergeGeometry,Materials.treeBranches);
  forrestMesh.name = 'forrestMesh'
  terrain.terrainShortcut.add(forrestMesh);

  var shadowsMesh = new THREE.Mesh(mergeShadowGeometry,Materials.terrainShadow);
  shadowsMesh.name = 'shadowsMesh'
  terrain.terrainShortcut.add(shadowsMesh);

}


function createClouds(terrain) {

  var mergeGeometry = new THREE.Geometry()

  var geometry = new THREE.IcosahedronGeometry(300,1)

  var originalCloud = new THREE.Mesh(geometry, null);

  var len = geometry.vertices.length;

  for (var i = 0; i < len; i++) {
    var point = geometry.vertices[i]

    if(point.y<0) point.y *= 0.2;
    else {
      point.y *= 1+Math.random()*0.4;
    }

    var random = (Math.random()*100-50)*Math.max(1,(point.y/500));
    point.x += random;
    point.z += random;

  }

  geometry.computeVertexNormals();


  originalCloud.position.set(-3000,800,-4000);
  originalCloud.scale.set(4,1.5,2)
  THREE.GeometryUtils.merge(mergeGeometry,originalCloud);

  originalCloud.position.set(3000,800,-3000);
  originalCloud.scale.set(3,0.8,2.5)
  THREE.GeometryUtils.merge(mergeGeometry,originalCloud);

  var cloudMesh = new THREE.Mesh(mergeGeometry, Materials.clouds )

  terrain.add(cloudMesh);
}


function createIcons(renderer){
  var icons = {};

  // change this when extra-list is refactored
  var tempColors = {
    "extraball": 0x0000ff,
    "speedball": 0x0000ff
  }

  // TODO refactor these somewhere else
  var iconTypes = [
    'extraball',
    'speedball'
  ]

  for (var i = iconTypes.length - 1; i >= 0; i--) {
    var iconType = iconTypes[i];

    // clone the material so they all won't get the same
    // colors...
    var iconMat = Materials.icon.clone();
    iconMat.uniforms.diffuse.value.setHex( tempColors[iconType] );

    // get geometry
    var iconGeo = Geometry[iconType];
    if( !iconGeo )
      throw new Error('geometry not found for '+iconType)

    var iconMesh = new THREE.Mesh( iconGeo, iconMat) ;
    iconMesh.scale.set(4,4,4);
    iconMesh.position.y = 10;

    var iconMirrorMesh = new THREE.Mesh( iconGeo, iconMat) ;
    iconMirrorMesh.position.y = -10;
    iconMirrorMesh.scale.set(1,-1,1);
    iconMesh.add(iconMirrorMesh);

    //white circle
    var circleGeo = new THREE.PlaneGeometry(50,50,1,1);
    var circleMesh = new THREE.Mesh(circleGeo, Materials.iconCircle);

    circleMesh.rotation.x = -Math.PI*.5;
    circleMesh.position.y = 1;
    iconMesh.add(circleMesh);

    //store to library
    icons[iconType] = iconMesh;
  };

  return icons;
}



function createForce(arena, world, force){
  debug('create force')
  var fc = force.type == 'attract' ? 0x00ff00 : 0xff0000;

  // TODO *50 is not correct. what would be the proper scale in comparison to the puck?
  var forceGeo = new THREE.SphereGeometry( force.mass*50 )
    , forceMat = new THREE.MeshPhongMaterial({ opacity: 0.1, color: fc, transparent:true })
    , forceMesh = new THREE.Mesh( forceGeo, forceMat );
  forceMesh.position.x = force.position[0];
  forceMesh.position.z = force.position[1];
  arena.add(forceMesh);
  return forceMesh;
}

function removeForce(force){
  debug('remove force')
  if( force.parent )
    force.parent.remove(force);
}


function createPuck(arena, puck){
  debug('create puck')
  var puckGeo = new THREE.CubeGeometry( 100,100,100 )
    , puckMesh = new THREE.Mesh( puckGeo, Materials.puck );
  puckMesh.name = 'puck'
  puckMesh.position.x = puck.current[0] - settings.data.arenaWidth/2;
  puckMesh.position.z = puck.current[1] - settings.data.arenaHeight/2;
  puckMesh.scale.x = (puck.aabb[1] - puck.aabb[3])/100
  puckMesh.scale.z = (puck.aabb[2] - puck.aabb[0])/100
  arena.add(puckMesh);
  return puckMesh;
}

function removePuck(puck){
  debug('remove puck')
  if( puck.parent )
    puck.parent.remove(puck);
}


// draw obstacles with THREE.Shape()
// http://mrdoob.github.com/three.js/examples/webgl_geometry_shapes.html
function createExtra(arena, world, icons, extra){
  debug('create extra')

  var w = settings.data.arenaWidth
    , h = settings.data.arenaHeight
    , hw = w*.5
    , hh = h*.5

  var icon = extra.id;

  // extra has an icon
  if( icon && icons[icon] ){
    var icon = icons[icon];
    icon.position.x = extra.current[0]-hw;
    icon.position.z = extra.current[1]-hh;
    arena.add(icon);
    return icon;

  // extra is a polygon
  } else if( extra.shape ){
    var shape = new THREE.Shape();
    var v = extra.shape.vertices[0];
    shape.moveTo(v[0]-hw,v[1]-hh);
    for( var i=1; i < extra.shape.vertices.length; i++ ){
      v = extra.shape.vertices[i];
      shape.lineTo(v[0]-hw,v[1]-hh);
    }

    // TODO these should already have been created
    var shapeGeo = new THREE.ExtrudeGeometry( shape, { amount: 40 } )
      , shapeMesh = new THREE.Mesh( shapeGeo, Materials.obstacle  );

    shapeMesh.rotation.x = Math.PI/2 // 90°
    shapeMesh.position.y = 20;

    arena.add(shapeMesh);
    return shapeMesh;

  } else {
    throw new Error('unsupported extra')
  }
}

function removeExtra(extra){
  debug('remove extra')
  if( extra.parent )
    extra.parent.remove(extra);
}

