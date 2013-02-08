var debug = require('debug')('renderer:3d:env')
  , ImprovedNoise = require('./improved-noise')
  , ObjectPool = require('./object-pool')
  , Materials = require('./materials')
  , Geometry = require('../geometry')
  , settings = require('../settings')
  , poly = require('geom').poly
  , stash = require('stash');

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

var bulletPool = createBulletPool()
var shieldPool = createShieldPool()

function Environment(renderer){
  debug('new')
  // used as camera.lookAt(this.env.center)
  this.center = new THREE.Vector3(0,0,0);
  this.arena = createArena(renderer)

  this.terrain = createTerrain(renderer)
  this.clouds = createClouds(this.terrain)
  this.lights = createLights(this.terrain)
  this.icons = createIcons(renderer)
  this.markerTimeout = 0;
  this.marker = createMarker(this.arena);

  this.extras = stash()
  this.obstacles = stash()
  this.forces = stash()
  this.bullets = stash()
  this.pucks = stash()
  this.shields = stash()
}

Environment.prototype = {

  reset: function(){
    debug('reset')

    // remove all forces/extras/pucks
    while(this.pucks.values.length)
      removePuck(this.pucks.values.pop());
    while(this.forces.values.length)
      removeForce(this.forces.values.pop());
    while(this.extras.values.length)
      removeExtra(this.extras.values.pop());
    while(this.obstacles.values.length)
      removeObstacle(this.obstacles.values.pop());
    while(this.bullets.values.length)
      removeBullet(this.bullets.values.pop());
    while(this.shields.values.length)
      removeShield(this.shields.values.pop(), true);

    this.pucks.empty()
    this.forces.empty()
    this.extras.empty()
    this.bullets.empty()
    this.obstacles.empty()
    this.shields.empty()
  },


  update: function(world,alpha){
    // add bodies

    while(world.added.length){
      var body = world.added.pop()
        , id = body.index;

      // create bullets
      if( world.bullets.has(id) ){
        var obj = createBullet(this.arena, world, body)
        this.bullets.set(id,obj)

      // create pucks
      } else if( world.pucks.has(id) ){
        var obj = createPuck(this.arena, body)
        this.pucks.set(id,obj)

      // create shields
      } else if( world.shields.has(id) ){
        var obj = createShield(this.arena, body)
        this.shields.set(id,obj)

      // create forces
      } else if( world.forces.has(id) ){
        var obj = createForce(this.arena, world, body)
        this.forces.set(id,obj)

      // create extras
      } else if( world.extras.has(id) ){
        var obj = createExtra(this.arena, world, this.icons, body)
        this.extras.set(id,obj)

      // create extras
      } else if( world.obstacles.has(id) ){
        var obj = createExtra(this.arena, world, this.icons, body)
        this.obstacles.set(id,obj)

      } else if( world.paddles.has(id) ){
        // this is done in player.js
        // but this is left here to skip the warning

      } else {
        console.warn('supposed to add',body,id)

      }
    }

    // remove bodies
    while(world.removed.length){
      var body = world.removed.pop()
        , id = body.index;

      if( this.bullets.has(id) ){
        removeBullet(this.bullets.get(id));
        this.bullets.del(id)

      } else if( this.pucks.has(id) ){
        removePuck(this.pucks.get(id));
        this.pucks.del(id);

      } else if( this.shields.has(id) ){
        removeShield(this.shields.get(id));
        this.shields.del(id)

      } else if( this.forces.has(id) ){
        removeForce(this.forces.get(id));
        this.forces.del(id);

      } else if( this.extras.has(id) ){
        removeExtra(this.extras.get(id));
        this.extras.del(id);

      } else if( this.obstacles.has(id) ){
        removeObstacle(this.obstacles.get(id));
        this.obstacles.del(id);

      } else {
        console.warn('supposed to remove',body,obj)

      }
    }

    // skips some jitter when frozen
    if( world.paused )
      return;

    var w = settings.data.arenaWidth
      , h = settings.data.arenaHeight
      , hw = w*.5
      , hh = h*.5;

    // update pucks
    for(var i=0; i < world.pucks.values.length; i++){
      var puck = world.pucks.values[i]
        , mesh = this.pucks.get(puck.index);

      mesh.position.x = puck.current[0] + (puck.current[0]-puck.previous[0])*alpha - hw;
      mesh.position.z = puck.current[1] + (puck.current[1]-puck.previous[1])*alpha - hh;

      mesh.scale.x = (puck.aabb[1] - puck.aabb[3])/100
      //mesh.scale.y = ((puck.aabb[1] - puck.aabb[3])/100)*2
      mesh.scale.z = (puck.aabb[2] - puck.aabb[0])/100

      if( mesh.material.color.getHex() != settings.theme.puckColor)
        mesh.material.color.setHex( settings.theme.puckColor );
    }

    // update bullets
    for(var i=0; i < world.bullets.values.length; i++){
      var shot = world.bullets.values[i]
        , mesh = this.bullets.get(shot.index);
      if( mesh ){
        mesh.position.x = shot.current[0] - hw;
        mesh.position.z = shot.current[1] - hh;
      } else {
        console.warn('world.bullets doesn\'t match with env.bullets - "%s" is missing from env',shot.id)
      }
    }
  },

  showLevelEditorMarker : function(paramObj) {

    var w = settings.data.arenaWidth
      , h = settings.data.arenaHeight
      , hw = w*.5
      , hh = h*.5;

    var marker = this.marker;

    var bound = extras[paramObj[0]].aabb
    marker.scale.x = (bound[1] - bound[3])/100
    marker.scale.y = settings.data.puckRadius*8/100
    marker.scale.z = (bound[2] - bound[0])/100



    marker.position.x = paramObj[1]-hw;
    marker.position.z = paramObj[2]-hh;

    marker.visible = true;

    clearTimeout(this.markerTimeout)

    this.markerTimeout = setTimeout(function(){
      marker.visible = false;
    },4000)
  }

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

  var sideGeo = new THREE.CubeGeometry(10,sideH,d,1,1,1);

  var rightMesh = new THREE.Mesh(sideGeo, Materials.arenaSideMaterials );
  rightMesh.position.x = hw;
  rightMesh.position.y = sideH*.5
  rightMesh.rotation.y = Math.PI;
  arena.add(rightMesh);
  arena.rightMesh = rightMesh;

  var leftMesh = new THREE.Mesh(sideGeo, Materials.arenaSideMaterials);
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

  var reflectionBoxGeo = new THREE.BoxGeometry(w,1000,d,1,1,1, { px: true, nx: true, py: false, ny: true, pz: true, nz: true });
  var blackBottomMesh = new THREE.Mesh( reflectionBoxGeo, Materials.reflectionBox);
  blackBottomMesh.position.y = -500;
  arena.add(blackBottomMesh);

  //digits
  var geom = new THREE.PlaneGeometry( 5*settings.data.unitSize, 8*settings.data.unitSize, 1, 1 );
  var digitPlane = new THREE.Mesh(geom, Materials.digitsPlayer1 );
  digitPlane.rotation.x = Math.PI*-.5;
  digitPlane.position.z = settings.data.arenaHeight*.5 - settings.data.unitSize*3 -  8*settings.data.unitSize*0.5;
  digitPlane.position.x = settings.data.arenaWidth*.5 - settings.data.unitSize*2 - 5*settings.data.unitSize*0.5;
  digitPlane.position.y = 3;
  arena.add(digitPlane);


  digitPlane = new THREE.Mesh(geom, Materials.digitsPlayer2 );
  digitPlane.rotation.x = Math.PI*-.5;
  digitPlane.rotation.z = Math.PI;

  digitPlane.position.z = -settings.data.arenaHeight*.5 + settings.data.unitSize*3 +  8*settings.data.unitSize*0.5;
  digitPlane.position.x = -settings.data.arenaWidth*.5 + settings.data.unitSize*2 + 5*settings.data.unitSize*0.5;
  digitPlane.position.y = 3;
  arena.add(digitPlane);

  return arena;
}


function createLights(terrain){
  debug('create lights')
  var lights = [];

  //var ambientLight = new THREE.AmbientLight(0x222222,0.5);
  //terrain.add(ambientLight)
  //lights.push(ambientLight)

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

  dirLight.position.set( 0, 1, 5 );
  dirLight.position.multiplyScalar( 50 );
  terrain.add(dirLight);
  lights.push(dirLight)

  settings.on("lightsUpdated", lightsUpdated.bind(this))

  lightsUpdated()

  function lightsUpdated(){

   // ambientLight.color.setHex(settings.data.ambientLightColor);
   // ambientLight.intensity = settings.data.ambientLightIntensity;
    dirLight.color.setHex(settings.data.dirLightColor);
    dirLight.intensity = settings.data.dirLightIntensity;

    dirLight.position.set( settings.data.dirLightX, 1, settings.data.dirLightZ );
    dirLight.position.multiplyScalar( 50 );

    pointLight.color.setHex(settings.data.pointLightColor);
    pointLight.intensity = settings.data.pointLightIntensity;
    hemLight.color.setHex(settings.data.hemisphereLightSkyColor);
    //hemLight.groundColor.setHex(settings.data.hemisphereLightGroundColor);
    hemLight.groundColor.setHex(settings.data.hemisphereLightGroundColor);
    hemLight.intensity = settings.data.hemisphereLightIntensity;
  }

  return lights;
}


function createTerrain(renderer){
  debug('create terrain')
  var geometry = Geometry.terrain;
  //geometry.computeVertexNormals();

  //geometry.mergeVertices();
  // close terrain
  var noise = null//new SimplexNoise()
    , len = geometry.vertices.length
    , h = 1000
    , n = 0
    , arenaW = settings.data.arenaWidth
    , arenaH = settings.data.arenaHeight;

  // offset and change color
 /* for (var i = 0; i < len; i++) {
    var point = geometry.vertices[i]

    var uvY = 1-((point.z / 4500) + 0.5);
    var uvX = point.x/3000

    point.y -= -20 + 100*uvY;
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
  }*/

  geometry.mergeVertices();
  geometry.computeVertexNormals();
  geometry.computeFaceNormals();
  geometry.computeCentroids();

/*
  var exporter = new THREE.OBJExporter();
  console.log(exporter.parse(geometry))
*/
  var terrain = new THREE.Object3D();
  terrain.name = 'terrain'
  renderer.container.add(terrain);

  var terrainMesh = new THREE.Mesh(geometry,Materials.terrain1)
  terrainMesh.position.z = 0;
  terrain.terrainShortcut = terrainMesh;
  terrain.add(terrainMesh);

  //distant terrain
  terrainMesh = createTerrainMesh(8000,2000,3505,20,3,new THREE.Color( 0x1f84d5),4,false, Materials.terrain2)
  terrainMesh.position.z = -7500;
  terrainMesh.position.x = Math.random()*5000-2500;
  terrainMesh.position.y = settings.data.arenaSurfaceY-200;
  terrainMesh.scale.x = 4;
  terrainMesh.scale.y = 3;
  terrain.add(terrainMesh);

  terrainMesh = createTerrainMesh(4000,5000,8505,40,20,new THREE.Color( 0x195475 ),4,false, Materials.terrain3)
  terrainMesh.position.z = -6000;
  terrainMesh.position.x = Math.random()*5000-2500;
  terrainMesh.position.y = settings.data.arenaSurfaceY - 200;
  terrainMesh.scale.x = 4;
  terrainMesh.scale.y = 1;
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
    point.x += Math.random()*160;
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
  shadowPlaneGeo.applyMatrix( new THREE.Matrix4().rotateX( -Math.PI*.5));

  //temp meshes
  var trunkMesh = new THREE.Mesh( trunkGeo,null );
  var shapeMesh = new THREE.Mesh( shapeGeo, null );
  var shadowMesh = new THREE.Mesh( shadowPlaneGeo, null );


  var gridX = 250;
  var gridY = 200;
  var pointAtVector = new THREE.Vector3(0, -1, 0);
  var marginVector = new THREE.Vector3(0,10,0)
  var rabbitSpawnPosition = new THREE.Vector3(4700,500,0)
  for (var px = gridX - 1; px >= 0; px--) {
    for (var py = gridY - 1; py >= 0; py--) {
      var uvX = px/gridX - .5;
      var uvY = py/gridY - .5;

      //TODO Prevent trees to grow at the paddle-setup-screen

      if( (uvX > -0.05 && uvX < 0.05 && uvY > -0.4 && uvY < 0.15)  ) continue;


      var n = ImprovedNoise.noise((uvX+0.5)*15, (uvY+0.5)*5,Math.random()*10 );

      if( n >= 0.55) {

        var scale = (n*n)+0.5;

        var newPosition = new THREE.Vector3(uvX*20000+Math.random()*50,500,uvY*8000+1000+Math.random()*50);

        if( newPosition.distanceTo(rabbitSpawnPosition) < 300 ) {
          console.log("skip tree")
          continue;
        }

        //shoot ray to find y
        var ray = new THREE.Raycaster( newPosition, pointAtVector);
        var intersects = ray.intersectObject(terrain.terrainShortcut);

        //find intersection with terrain
        if ( intersects.length > 0 ) {
          newPosition = intersects[0].point.clone().add( marginVector);
        }
        else {
          //skip this tree
          continue;
        }

         var intersectionNormal = intersects[0].face.normal;

        trunkMesh.scale.set(scale,scale,scale)
        trunkMesh.position = newPosition
        //trunkMesh.rotation.set(intersectionNormal.x,intersectionNormal.y, intersectionNormal.z).negate();
        THREE.GeometryUtils.merge(mergeGeometry,trunkMesh);

        shapeMesh.rotation.y = Math.random();
        shapeMesh.position = newPosition
        //shapeMesh.rotation.set(intersectionNormal.x,intersectionNormal.y, intersectionNormal.z).negate();
        shapeMesh.scale.set(scale,scale,scale)


        THREE.GeometryUtils.merge(mergeGeometry,shapeMesh);

        shadowMesh.position = newPosition
        shadowMesh.scale.set(scale,scale,scale)

        shadowMesh.rotation.set(intersectionNormal.x,intersectionNormal.y, intersectionNormal.z).negate();



        THREE.GeometryUtils.merge(mergeShadowGeometry,shadowMesh);

      }
    };
  };

  var forrestMesh = new THREE.Mesh(mergeGeometry,Materials.treeBranches);
  forrestMesh.name = 'forrestMesh'
  terrain.terrainShortcut.add(forrestMesh);

  var shadowsMesh = new THREE.Mesh(mergeShadowGeometry,Materials.terrainShadow);
  shadowsMesh.name = 'shadowsMesh'
  terrain.terrainShortcut.add(shadowsMesh);

}


function createClouds(terrain) {

  /*var mergeGeometry = new THREE.Geometry()
  var geometry = new THREE.IcosahedronGeometry(300,1)

  var originalCloud = new THREE.Mesh(geometry, null);

  /*var len = geometry.vertices.length;
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
*/
//console.log(Geometry.clouds2);

return;

  var cloudMesh;
  var pos = [

    new THREE.Vector3(-3400,1000,-4000),
    new THREE.Vector3(4000,1000,-5000),
    new THREE.Vector3(1000,1000,-4000),
    new THREE.Vector3(-2000,1000,-7000),
  ]

  for (var i = Geometry.clouds.length - 1; i >= 0; i--) {
     cloudMesh = new THREE.Mesh( Geometry.clouds[i] ,Materials.clouds);
     cloudMesh.position = pos[i];
     cloudMesh.scale.set(3,3,3+Math.random()*2);
     terrain.add(cloudMesh);
  };

  //set 2
  pos = [
    new THREE.Vector3(-1400,1000,4000),
    new THREE.Vector3(6000,1000,5000),
    new THREE.Vector3(3000,1000,4000),
    new THREE.Vector3(-5000,1000,7000),
  ]

  for (var i = Geometry.clouds.length - 1; i >= 0; i--) {
     cloudMesh = new THREE.Mesh( Geometry.clouds[i] ,Materials.clouds);
     cloudMesh.position = pos[i];
     cloudMesh.scale.set(2,2,2);
     terrain.add(cloudMesh);
  };

  //set 3
  pos = [
    new THREE.Vector3(-13400,1000,1000),
    new THREE.Vector3(-13000,1000,-1000),
    new THREE.Vector3(13000,1000,1000),
    new THREE.Vector3(13000,1000,-1000),
  ]

  for (var i = Geometry.clouds.length - 1; i >= 0; i--) {
     cloudMesh = new THREE.Mesh( Geometry.clouds[i] ,Materials.clouds);
     cloudMesh.position = pos[i];
     cloudMesh.scale.set(3,3+Math.random()*2,3+Math.random()*2);
     terrain.add(cloudMesh);
  };

}


function createIcons(renderer){
  var icons = {};

  // get the extras form the geometry
  var iconTypes = Object.keys(Geometry);

  for (var i = iconTypes.length - 1; i >= 0; i--) {

    if( iconTypes[i].indexOf("extra_") == -1 ) continue;

    var iconType = iconTypes[i];

    var iconMat = Materials.icon;
    var iconReflectionMat = Materials.iconReflection;
    //iconMat.uniforms.diffuse.value.setHex( tempColors[iconType] );

    // get geometry

    var iconGeo = Geometry[iconType];

    if( !iconGeo )
      throw new Error('geometry not found for '+iconType)

    THREE.GeometryUtils.center(iconGeo);
    iconGeo.applyMatrix( new THREE.Matrix4().makeScale(30,30,30) );
    iconGeo.applyMatrix( new THREE.Matrix4().makeRotationX( 90*Math.PI/180 ) );
    iconGeo.applyMatrix( new THREE.Matrix4().makeTranslation(0,iconGeo.boundingBox.min.z*-29,0))

    var iconMesh = new THREE.Mesh( iconGeo, iconMat) ;
    iconMesh.position.y = 30;

    var iconMirrorMesh = new THREE.Mesh( iconGeo, iconReflectionMat) ;
    iconMirrorMesh.position.y = -30;
    iconMirrorMesh.scale.set(1,-1,1);
    iconMesh.add(iconMirrorMesh);

    //white circle
    /*var circleGeo = new THREE.PlaneGeometry(200,200,1,1);
    var circleMesh = new THREE.Mesh(circleGeo, Materials.iconCircle);

    circleMesh.rotation.x = -Math.PI*.5;
    circleMesh.position.y = 1;
    iconMesh.add(circleMesh);
*/
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

  var cubeSize = (puck.aabb[1] - puck.aabb[3]);

  var puckGeo = new THREE.CubeGeometry(100,cubeSize*2,100 )
    , puckMesh = new THREE.Mesh( puckGeo, Materials.puck );

  puckMesh.scale.x = cubeSize/100
  puckMesh.scale.z = cubeSize/100

  puckMesh.name = 'puck'

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

  var icon = extra.id && ("extra_" + extra.id.replace(/ /g,''));

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
    var x = extra.current[0]
      , y = extra.current[1]
      , v = extra.shape.vertices[0];
    shape.moveTo(v[0]-x,v[1]-y);
    for( var i=1; i < extra.shape.vertices.length; i++ ){
      v = extra.shape.vertices[i];
      shape.lineTo(v[0]-x,v[1]-y);
    }

    // TODO these should already have been created
    var uvGenerator = THREE.ExtrudeGeometry.WorldUVGenerator;
    var shapeGeo = new THREE.ExtrudeGeometry( shape, {
        amount: settings.data.puckRadius*8,
        bevelEnabled: false,
        //uvGenerator: uvGenerator,
        extrudeMaterial: 0,
        material: 1
      } )
      , shapeMesh = new THREE.Mesh( shapeGeo , new THREE.MeshFaceMaterial([Materials.obstacleSide, Materials.arenaGrid]) );



    THREE.GeometryUtils.center(shapeGeo);
    shapeMesh.rotation.x = Math.PI/2 // 90°
    //shapeMesh.position.y = settings.data.puckRadius*4;
    shapeMesh.position.x = x-hw;
    shapeMesh.position.z = y-hh;
    shapeMesh.scale.z = 0;

    TweenMax.to(shapeMesh.scale,0.4,{z:1,ease:Back.easeOut})

    arena.add(shapeMesh);
    return shapeMesh;

  } else {
    throw new Error('unsupported extra')
  }
}

function removeExtra(extra){
  debug('remove extra')
  if( extra && extra.parent )
    extra.parent.remove(extra);
}

function removeObstacle(obstacle){
  debug('remove obstacle');

  TweenMax.to(obstacle.scale,0.4,{ease:Back.easeIn,onComplete:function(){
    if( obstacle && obstacle.parent )
        obstacle.parent.remove(obstacle);
  }})
}


function createShield(arena, body){
  debug('create shield')

  var mesh = shieldPool.getObject();

  mesh.position.x = body.current[0] - settings.data.arenaWidth/2;
  mesh.position.z = body.current[1] - settings.data.arenaHeight/2;
  mesh.scale.x = (body.aabb[1] - body.aabb[3])/100
  mesh.scale.z = (body.aabb[2] - body.aabb[0])/100
  mesh.scale.y = 0.01;


  mesh.material.opacity = 1;

  TweenMax.to( mesh.scale, 0.5, {y:1,delay:1.4,ease:Sine.easeOut,onStart:function(){
    dmaf.tell( "shield_reset_up");
    arena.add(mesh);
  }});
  TweenMax.to( mesh.material, 0.5, {opacity:0.2,delay:1.9,ease:Sine.easeOut});


  return mesh;
}

function removeShield(shield, fast ){
  debug('remove shield')
  if( shield.parent ) {

    var animDelay = 0.3

    if( !fast) {
      shield.material.opacity = 1;
      dmaf.tell( "shield_reset_down");
      TweenMax.to( shield.material, 0.5, {opacity:0,ease:Sine.easeOut});
      animDelay = 0;
    }

    TweenMax.to(shield.scale,0.2,{delay:animDelay,y:0.01, ease:Sine.easeIn, onStart:function(){
      dmaf.tell( "shield_reset_down");
    },onComplete:function(){

      if( shield && shield.parent ){
        shield.parent.remove(shield);
        shieldPool.returnObject(shield.poolId);
      }

    }})

  }
}


function createBullet(arena, world, body){
  debug('create bullet')
  var mesh = bulletPool.getObject();
  mesh.position.x = body.current[0]-settings.data.arenaWidth*.5;
  mesh.position.z = body.current[1]-settings.data.arenaHeight*.5;
  mesh.position.y = 4;
  arena.add(mesh);
  return mesh;
}

function removeBullet(bullet){
  debug('remove bullet')
  if( bullet && bullet.parent ){
    bullet.parent.remove(bullet);
    bulletPool.returnObject(bullet.poolId);
  }
}

function createBulletPool() {
  var BulletPool = new ObjectPool();
  var bulletGeo = new THREE.PlaneGeometry( settings.data.arenaWidth/settings.data.arenaColumns,150 );
  BulletPool.createObject = function(){
    var bulletMat = new THREE.MeshLambertMaterial( { transparent:true, depthWrite:false,color: 0xffff00})
      , bulletMesh = new THREE.Mesh( bulletGeo, bulletMat );
    bulletMesh.rotation.x = Math.PI*-.5
    return bulletMesh;
  }.bind(this)
  return BulletPool;
}

function createShieldPool() {
  var ShieldPool = new ObjectPool();

  var geom = new THREE.BoxGeometry(100,settings.data.arenaSideHeight,100,1,1,1,{ px: true, nx: true, py: true, ny: false, pz: true, nz: false })
  geom.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(0, settings.data.arenaSideHeight*.5, 0)));


  ShieldPool.createObject = function(){

    var mesh = new THREE.Mesh( geom, Materials.shield.clone() );
   // mesh.material.uniforms.uBrightness.value = Math.random();
   mesh.material.opacity = 1;
    mesh.name = 'shield';
    return mesh;
  }.bind(this)

  return ShieldPool;
}

function createMarker( arena ) {
  var shapeGeo = new THREE.CubeGeometry( 100,100,100 )
    , shapeMesh = new THREE.Mesh( shapeGeo, Materials.obstacle  );
  shapeMesh.visible = false;
  arena.add(shapeMesh);
  return shapeMesh;
}


