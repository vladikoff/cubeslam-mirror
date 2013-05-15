var debug = require('debug')('renderer:3d:env')
  , ImprovedNoise = require('../improved-noise')
  , settings = require('../settings')
  , dmaf = require('../dmaf.min')
  , actions = require('../actions')
  , generateForrest = require('./generate-forrest')
  , Materials = require('./materials')
  , Shield = require('./shield')
  , Bullet = require('./bullet')
  , Puck = require('./puck')
  , Geometry = require('./geometry')
  , poly = require('geom').poly
  , pool = require('../support/pool')
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

function Environment(renderer){
  debug('new')
  // used as camera.lookAt(this.env.center)
  this.renderer = renderer;
  this.center = new THREE.Vector3(0,0,0);
  this.arena = createArena(renderer)


  this.terrain = createTerrain(renderer);

  this.lights = createLights(this.terrain)
  this.icons = createIcons(renderer)

  if( settings.data.quality !== settings.QUALITY_MOBILE) {
    this.clouds = createClouds(this.terrain)
  }

  generateForrest(this);

  settings.on('generateForrest', generateForrest.bind(null,this) );

  this.introPuck = new THREE.Mesh(new THREE.CubeGeometry(settings.data.unitSize,settings.data.unitSize*2,settings.data.unitSize), Materials.puck.clone() );
  this.arena.add( this.introPuck );

  this.extras = stash()
  this.obstacles = stash()
  this.forces = stash()
  this.bullets = stash()
  this.pucks = stash()
  this.shields = stash()

  // only listen to changes from the 'game'-world
  // (and 'sync' in multiplayer)
  this.setupAddedRemoved('game');
}

Environment.prototype = {

  setupAddedRemoved: function(worldName){
    // remove any previous added/removed listeners
    if( this.onadded ){
      actions.off('added',this.onadded)
      actions.off('removed',this.onremoved)
    }

    this.onadded = function(type,world,body){
      if(world.name !== worldName) {
        return
      }

      debug('added',type,body.index)
      var obj;

      switch(type){
        case 'extra':
          obj = createExtra(this.arena, world, this.icons, body)
          this.extras.set(body.index,obj)
          break;
        case 'bullet':
          obj = Bullet.alloc().add(this.arena, body, world);
          this.bullets.set(body.index,obj)
          break;
        case 'puck':
          obj = Puck.alloc().add(this.arena, body, world);
          this.pucks.set(body.index,obj)
          break;
        case 'shield':
          obj = Shield.alloc().add(this.arena, body, world);
          this.shields.set(body.index,obj)
          break;
        case 'force':
          obj = createForce(this.arena, world, body)
          this.forces.set(body.index,obj)
          break;
        case 'obstacle':
          obj = createExtra(this.arena, world, this.icons, body)
          this.obstacles.set(body.index,obj)
          break;
        default:
          throw new Error('invalid type: '+type);
      }
    }.bind(this)

    this.onremoved = function(type,world,body){
      if(world.name !== worldName) {
        return;
      }

      debug('removed',type,body.index)
      switch(type){
        case 'extra':
          removeExtra(this.extras.get(body.index),false);
          this.extras.del(body.index);
          break;
        case 'bullet':
          if( this.bullets.has(body.index) ){
            this.bullets.get(body.index).remove();
            this.bullets.del(body.index)
          } else {
            console.warn('no bullet %s found to remove',body.index)
          }
          break;
        case 'puck':
          this.pucks.get(body.index).remove();
          this.pucks.del(body.index);
          break;
        case 'shield':

          this.shields.get(body.index).remove(body.data.blownAway);
          this.shields.del(body.index)
          break;
        case 'force':
          removeForce(this.forces.get(body.index));
          this.forces.del(body.index);
          break;
        case 'obstacle':
          removeObstacle(this.obstacles.get(body.index));
          this.obstacles.del(body.index);
          break;
        default:
          throw new Error('invalid type: '+type);
      }
    }.bind(this)

    actions.on('added',this.onadded)
    actions.on('removed',this.onremoved)
  },

  reset: function(){
    debug('reset')

    if( this.introPuck ) {
      this.introPuck.parent.remove(this.introPuck);
      this.introPuck = null;
    }

    // remove all forces/extras/pucks
    while(this.pucks.values.length) {
      this.pucks.values.pop().reset();
    }
    while(this.forces.values.length) {
      removeForce(this.forces.values.pop());
    }
    while(this.extras.values.length) {
      removeExtra(this.extras.values.pop(),false);
    }
    while(this.obstacles.values.length) {
      removeObstacle(this.obstacles.values.pop());
    }
    while(this.bullets.values.length) {
      this.bullets.values.pop().reset();
    }
    while(this.shields.values.length) {
      this.shields.values.pop().reset();
    }

    this.pucks.empty()
    this.forces.empty()
    this.extras.empty()
    this.bullets.empty()
    this.obstacles.empty()
    this.shields.empty()
  },


  update: function(world,alpha){
    // avoids some jitter when frozen/paused
    if( world.state !== 'playing' ) {
      return;
    }

    var w = settings.data.arenaWidth
      , h = settings.data.arenaHeight
      , hw = w*0.5
      , hh = h*0.5
      , i = 0;

    // update pucks
    for( i=0; i < world.pucks.values.length; i++){
      var puck = world.pucks.values[i];
      if( this.pucks.has(puck.index) ){
        this.pucks.get(puck.index).update(world,puck,alpha);

        // update bear look at
        if( !world.multiplayer && i===0) {
          this.renderer.animals.updateBearLookAt(this.pucks.get(puck.index).mesh.position.z);
        }
      }
    }

     // update bullets
    for( i=0; i < world.bullets.values.length; i++){
      var bullet = world.bullets.values[i];
      if( this.bullets.has(bullet.index) ){
        this.bullets.get(bullet.index).update(world,bullet,alpha);
      }
    }

    // update forces
    for( i=0; i < world.forces.values.length; i++){
      var force = world.forces.values[i]

      if( this.forces.has(force.index) ){
        var mesh = this.forces.get(force.index);
        if( mesh.visible != force.active ){
          mesh.material = (force.type === 'repell')? Materials.forceRepell:Materials.forceAttract;
        }
        mesh.visible = force.active;

      } else if( !world.multiplayer ){
        console.error('renderer missing a force of index %s',force.index);

      } // else the puck hasn't been created in "sync" yet.
    }

    // update shields
    for( i=0; i < world.shields.values.length; i++){
      var shield = world.shields.values[i];
      if( this.shields.has(shield.index) ){
        this.shields.get(shield.index).update(world)
      }
    }
  }
}

function createArena(renderer){
  debug('create arena')
  var w = settings.data.arenaWidth
    , h = w/16*9
    , hw = w*0.5
    , hh = h*0.5
    , d = settings.data.arenaHeight
    , sideH = settings.data.arenaSideHeight
    , boxDepth = settings.data.videoBoxDepth

  var arena = new THREE.Object3D();
  arena.name = 'arena'
  arena.position.y = settings.data.arenaSurfaceY;
  renderer.container.add(arena);

  // boundingbox


  var sideGeo = new THREE.CubeGeometry(10,sideH,d,1,1,1);

  var rightMesh = new THREE.Mesh(sideGeo, Materials.arenaSideMaterials );
  rightMesh.position.x = hw;
  rightMesh.position.y = sideH*0.5
  rightMesh.rotation.y = Math.PI;
  arena.add(rightMesh);
  arena.rightMesh = rightMesh;

  var leftMesh = new THREE.Mesh(sideGeo, Materials.arenaSideMaterials);
  leftMesh.position.x = -hw;
  leftMesh.position.y = sideH*0.5;
  arena.add(leftMesh);
  arena.leftMesh = leftMesh;

  //construct pit walls

  var sideGeoPart = new THREE.CubeGeometry(10,sideH,boxDepth+5,1,1,1);
  var finalGeo = new THREE.Geometry();

  //a:left wall
  var tempMesh = new THREE.Mesh(sideGeoPart, Materials.arenaBorder );
  tempMesh.position.set(-hw,sideH*0.5,d*0.5+boxDepth*0.5+2.5)
  THREE.GeometryUtils.merge(finalGeo, tempMesh);

  //a:right wall
  tempMesh.position.set(hw,sideH*0.5,d*0.5+boxDepth*0.5+2.5)
  THREE.GeometryUtils.merge(finalGeo, tempMesh);

  //b:left wall
  tempMesh.position.set(-hw,sideH*0.5,-d*0.5-boxDepth*0.5-2.5)
  THREE.GeometryUtils.merge(finalGeo, tempMesh);

  //b:right wall
  tempMesh.position.set(hw,sideH*0.5,-d*0.5-boxDepth*0.5-2.5)
  THREE.GeometryUtils.merge(finalGeo, tempMesh);

  var bottomGeoPart = new THREE.CubeGeometry(w,sideH,10,1,1,1);
  //a:bottom wall
  tempMesh = new THREE.Mesh(bottomGeoPart, Materials.arenaBorder );
  tempMesh.position.set(0,sideH*0.5,d*0.5+boxDepth)
  THREE.GeometryUtils.merge(finalGeo, tempMesh);

  //b:bottom wall
  tempMesh = new THREE.Mesh(bottomGeoPart, Materials.arenaBorder );
  tempMesh.position.set(0,sideH*0.5,-d*0.5-boxDepth)
  THREE.GeometryUtils.merge(finalGeo, tempMesh);

   //a:floor
  var floorGeoPart = new THREE.PlaneGeometry(w,boxDepth,1,1,1);
  tempMesh = new THREE.Mesh(floorGeoPart, Materials.arenaBorder );
  tempMesh.rotation.x = Math.PI*-0.5;
  tempMesh.position.set(0,0,-d*0.5-boxDepth*0.5)
  THREE.GeometryUtils.merge(finalGeo, tempMesh);

  //b:floor
  tempMesh.position.set(0,0,d*0.5+boxDepth*0.5)
  THREE.GeometryUtils.merge(finalGeo, tempMesh);

  var finalMesh = new THREE.Mesh(finalGeo, Materials.arenaBorder );
  arena.add(finalMesh);

  var centerLineGeo = new THREE.PlaneGeometry(25,sideH+1,1,1 );
  var centerLineMesh = new THREE.Mesh(centerLineGeo,Materials.centerLine)
  centerLineMesh.position.x = 5.2;
  centerLineMesh.rotation.y = Math.PI*0.5;
  arena.leftMesh.add(centerLineMesh);

  var centerLineMesh2 = new THREE.Mesh(centerLineGeo,Materials.centerLine);
  centerLineMesh2.position.x = 5.2;
  centerLineMesh2.rotation.y = -Math.PI*0.5;
  arena.rightMesh.add(centerLineMesh2);


  var centerLineMeshFloor = new THREE.Mesh(centerLineGeo,Materials.centerLine);
  centerLineMeshFloor.position.y = 1;
  centerLineMeshFloor.scale.y = settings.data.arenaWidth/settings.data.arenaSideHeight;
  centerLineMeshFloor.rotation.z = Math.PI*0.5;
  centerLineMeshFloor.rotation.x = Math.PI*0.5;
  arena.add(centerLineMeshFloor);

  //table
  var table = new THREE.Mesh( new THREE.PlaneGeometry(w,d,1,1), Materials.arenaGrid);
  table.rotation.x = -Math.PI*0.5
  table.position.y = 0;
  arena.add(table);

  var reflectionBoxGeo = new THREE.BoxGeometry(w,1000,d,1,1,1, { px: true, nx: true, py: false, ny: true, pz: true, nz: true });
  var blackBottomMesh = new THREE.Mesh( reflectionBoxGeo, Materials.reflectionBox);
  blackBottomMesh.position.y = -500;
  arena.add(blackBottomMesh);

  //digits
  var geom = new THREE.PlaneGeometry( 5*settings.data.unitSize+8, 9*settings.data.unitSize+8, 1, 1 );
  var digitPlane = new THREE.Mesh(geom, Materials.digitsPlayer1 );
  digitPlane.rotation.x = Math.PI*-0.5;
  digitPlane.position.z = settings.data.arenaHeight*0.5 - settings.data.unitSize*2 -  9*settings.data.unitSize*0.5;
  digitPlane.position.x = settings.data.arenaWidth*0.5 - settings.data.unitSize*2 - 5*settings.data.unitSize*0.5-5;
  digitPlane.position.y = 0;
  arena.add(digitPlane);


  digitPlane = new THREE.Mesh(geom, Materials.digitsPlayer2 );
  digitPlane.rotation.x = Math.PI*-0.5;
  digitPlane.rotation.z = Math.PI;

  digitPlane.position.z = -settings.data.arenaHeight*0.5 + settings.data.unitSize*2 +  9*settings.data.unitSize*0.5;
  digitPlane.position.x = -settings.data.arenaWidth*0.5 + settings.data.unitSize*2 + 5*settings.data.unitSize*0.5;
  digitPlane.position.y = 0;
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
  dirLight.position.multiplyScalar( 150 );
  terrain.add(dirLight);
  lights.push(dirLight)

  settings.on('lightsUpdated', lightsUpdated.bind(this))

  lightsUpdated()

  function lightsUpdated(){

   // ambientLight.color.setHex(settings.data.ambientLightColor);
   // ambientLight.intensity = settings.data.ambientLightIntensity;
    dirLight.color.setHex(settings.data.dirLightColor);
    dirLight.intensity = settings.data.dirLightIntensity;

    dirLight.position.set( settings.data.dirLightX, settings.data.dirLightY, settings.data.dirLightZ ).normalize();
    //dirLight.position.multiplyScalar( 50 );

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

  // close terrain
  var noise = null//new SimplexNoise()
    , h = 1000
    , n = 0
    , arenaW = settings.data.arenaWidth
    , arenaH = settings.data.arenaHeight;

  var terrain = new THREE.Object3D();
  renderer.container.add(terrain);
  //var geo = ( settings.data.quality === settings.QUALITY_MOBILE )?Geometry.terrainLow:Geometry.terrain;
  var terrainMesh = new THREE.Mesh(Geometry.terrain,Materials.terrain1)
  terrainMesh.position.z = 0;
  terrainMesh.position.y = -6;
  terrain.terrainShortcut = terrainMesh;
  terrain.add(terrainMesh);

  var normalHelper = new THREE.FaceNormalsHelper(terrainMesh,60);

  settings.on('terrainNormalsChanged', function(){
    if( settings.data.terrainNormals ) {
      terrain.add(normalHelper);
    }
    else if( normalHelper.parent ){
      terrain.remove(normalHelper);
    }
  })

  var segments = ( settings.data.quality === settings.QUALITY_MOBILE)? new THREE.Vector2(10,2) :new THREE.Vector2(20,3);

  //distant terrain
  terrainMesh = createTerrainMesh(8000,2000,3505,segments.x,segments.y,new THREE.Color( 0x1f84d5),4,false, Materials.terrain2)
  terrainMesh.position.z = -7500;
  terrainMesh.position.x = Math.random()*5000-2500;
  terrainMesh.position.y = settings.data.arenaSurfaceY-200;
  terrainMesh.scale.x = 4;
  terrainMesh.scale.y = 3;
  terrain.add(terrainMesh);

  segments = ( settings.data.quality === settings.QUALITY_MOBILE)? new THREE.Vector2(20,10) :new THREE.Vector2(40,20);

  terrainMesh = createTerrainMesh(4000,5000,8505,segments.x,segments.y,new THREE.Color( 0x195475 ),4,false, Materials.terrain3)
  terrainMesh.position.z = -6000;
  terrainMesh.position.x = Math.random()*5000-2500;
  terrainMesh.position.y = settings.data.arenaSurfaceY - 200;
  terrainMesh.scale.x = 4;
  terrainMesh.scale.y = 1;
  terrain.add(terrainMesh);


  return terrain;
}


function createTerrainMesh( w, h, extrude, segW, segH, baseColor, noiseFactor, bValley, material ){

  var n = 0
    , faceIndices = [ 'a', 'b', 'c', 'd' ]
    , newColor = null
    , geometry = new THREE.PlaneGeometry(w,h,segW,segH)
    , len = geometry.vertices.length;

  THREE.GeometryUtils.triangulateQuads(geometry);

  // offset and change color
  var freq = 50;
  var z = Math.random() * 10;

  for (var i = 0; i < len; i++) {
    var point = geometry.vertices[i]
    point.x += Math.random()*60;
    point.y += Math.random()*150-70;

    if( Math.random() > 0.8 && i > 0 ) {
      if( point.distanceTo( geometry.vertices[i-1]) < 400 ) {
        point = geometry.vertices[i-1].clone();
      }
    }

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

  //geometry.computeVertexNormals();
  geometry.mergeVertices();
  geometry.computeFaceNormals();

  var mountainMesh = new THREE.Mesh(geometry, material)
  mountainMesh.rotation.x = Math.PI*-0.5
  return mountainMesh;
}



function createClouds(terrain) {

  var cloudMesh;

  cloudMesh = new THREE.Mesh( Geometry.cloud1 ,Materials.clouds);
  cloudMesh.position.set(-3400,1600,-6000);
  //cloudMesh.rotation.y = -Math.PI*.1;
  cloudMesh.scale.set(20,20,17+Math.random()*2);
  terrain.add(cloudMesh);

  cloudMesh = new THREE.Mesh( Geometry.cloud1 ,Materials.clouds);
  cloudMesh.position.set(-2000,1600,-10000);
  cloudMesh.scale.set(20,20,20);
  terrain.add(cloudMesh);


  cloudMesh = new THREE.Mesh( Geometry.cloud2 ,Materials.clouds);
  cloudMesh.position.set(3000,1600,-10000);
  cloudMesh.scale.set(30,30,30);
  terrain.add(cloudMesh);

  cloudMesh = new THREE.Mesh( Geometry.cloud3 ,Materials.clouds);
  cloudMesh.position.set(4000,1600,-6000);
  //cloudMesh.rotation.y = Math.PI*0.5;
  cloudMesh.scale.set(20,20,17+Math.random()*2);
  terrain.add(cloudMesh);


  cloudMesh = new THREE.Mesh( Geometry.cloud2 ,Materials.clouds);
  cloudMesh.position.set(-5000,1600,-1000);
  cloudMesh.scale.set(20,20,20+Math.random()*2);
  terrain.add(cloudMesh);

  cloudMesh = new THREE.Mesh( Geometry.cloud3 ,Materials.clouds);
  cloudMesh.position.set(-5000,1600,4000);
  cloudMesh.scale.set(20,20,20);
  cloudMesh.rotation.y = Math.PI;
  terrain.add(cloudMesh);

}


function createIcons(renderer){
  var icons = {};

  // get the extras form the geometry
  var iconTypes = Object.keys(Geometry);

  for (var i = iconTypes.length - 1; i >= 0; i--) {

    if( iconTypes[i].indexOf('extra_') === -1 ) {
      continue;
    }

    var iconType = iconTypes[i];

    var iconMat = Materials.icon;
    var iconReflectionMat = Materials.iconReflection;

    // get geometry
    var iconGeo = Geometry[iconType];
    THREE.GeometryUtils.center(iconGeo);
    iconGeo.applyMatrix( new THREE.Matrix4().makeScale(30,30,30) );
    iconGeo.applyMatrix( new THREE.Matrix4().makeRotationX( 90*Math.PI/180 ) );
    iconGeo.applyMatrix( new THREE.Matrix4().makeTranslation(0,iconGeo.boundingBox.min.z*-29,0))

    var meshStack = [];

    var iconMesh = new THREE.Mesh( iconGeo, iconMat) ;
    iconMesh.position.y = 40;

    if( settings.data.quality !== settings.QUALITY_MOBILE ) {
      var iconMirrorMesh = new THREE.Mesh( iconGeo, iconReflectionMat) ;
      iconMirrorMesh.position.y = -40;
      iconMirrorMesh.scale.set(1,-1,1);
      iconMesh.add(iconMirrorMesh);
    }

    meshStack.push(iconMesh);

    //store to library
    icons[iconType] = meshStack;
  }

  return icons;
}

function createForce(arena, world, force){
  debug('create force',force)

  var w = settings.data.arenaWidth
    , h = settings.data.arenaHeight
    , hw = w*0.5
    , hh = h*0.5

  // TODO *50 is not correct. what would be the proper scale in comparison to the puck?
  var forceGeo = new THREE.PlaneGeometry( settings.data.unitSize*7,settings.data.unitSize*7,1,1 )
    , forceMesh = new THREE.Mesh( forceGeo, force.type == 'attract' ? Materials.forceAttract : Materials.forceRepell );
  forceMesh.position.x = force.position[0]-hw;
  forceMesh.position.z = force.position[1]-hh;
  forceMesh.position.y = 5;
  forceMesh.rotation.x = Math.PI*-0.5;

  arena.add(forceMesh);

  return forceMesh;
}

function removeForce(force){
  debug('remove force')

  TweenMax.killTweensOf(force);

  if( force.parent ) {
    force.parent.remove(force);
  }
}

function getExtraMesh( arena,icons, id ) {

  var meshStack = icons[id];
  for (var i = meshStack.length - 1; i >= 0; i--) {
    var mesh = meshStack[i]
    if( !mesh.parent ) {
      arena.add(mesh);
      return mesh;
    }
  }

  //no mesh found, add another one
  var cloned = meshStack[0].clone();
  arena.add(cloned);
  meshStack.push(cloned)
  return cloned;

}

// draw obstacles with THREE.Shape()
// http://mrdoob.github.com/three.js/examples/webgl_geometry_shapes.html
function createExtra(arena, world, icons, extra){
  debug('create extra')

  var w = settings.data.arenaWidth
    , h = settings.data.arenaHeight
    , hw = w*0.5
    , hh = h*0.5
    , id = extra.data.id
    , iconName = id && ('extra_'+id);

  // extra has an icon
  if( iconName && icons[iconName] ){

    var icon = getExtraMesh(arena,icons,iconName);

    icon.position.x = extra.current[0]-hw;
    icon.position.z = extra.current[1]-hh;
    icon.position.y = 200;
    if( icon.children[0] ) {
      icon.children[0].position.y = -400;
    }
    TweenMax.from(icon.rotation,0.5,{y:Math.PI*4,ease:Sine.easeOut})
    TweenMax.to(icon.position,0.5,{y:40,ease:Sine.easeOut})
    if(icon.children[0]) {
      TweenMax.to(icon.children[0].position,0.5,{y:-40,ease:Sine.easeOut})
    }
    return icon;

  // extra is a polygon
  } else if( extra.shape ){

    var shape = new THREE.Shape();
    var x = extra.current[0]
      , y = extra.current[1]
      , v = extra.shape.vertices[0];

    // normalize the coordinates around [0,0]
    shape.moveTo(v[0]-x,v[1]-y);
    for( var i=1; i < extra.shape.vertices.length; i++ ){
      v = extra.shape.vertices[i];
      shape.lineTo(v[0]-x,v[1]-y);
    }

    // TODO these should already have been created
    var shapeGeo = new THREE.ExtrudeGeometry(shape,{
          amount: settings.data.arenaSideHeight*2,
          bevelEnabled: false,
          extrudeMaterial: 0,
          material: 1
        })


    shapeGeo.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(0, 0, settings.data.arenaSideHeight*-1)));
    var shapeMesh = new THREE.Mesh( shapeGeo , new THREE.MeshFaceMaterial([Materials.obstacleSide, Materials.obstacle2]) );

    shapeMesh.rotation.x = Math.PI/2 // 90°

    shapeMesh.position.x = x-hw;
    shapeMesh.position.z = y-hh;
    shapeMesh.scale.z = 0.01;

    TweenMax.to(shapeMesh.scale,0.4,{z:1,ease:Back.easeOut})

    arena.add(shapeMesh);
    return shapeMesh;

  } else {
    throw new Error('unsupported extra')
  }
}


//Remove stuff

function removeExtra(extra, animate){
  debug('remove extra')
  if( animate ) {
    TweenMax.to(extra.rotation,0.5,{y:Math.PI*4,ease:Sine.easeIn})
    TweenMax.to(extra.position,0.5,{y:200,ease:Sine.easeIn})
    if(extra.children[0]) {
        TweenMax.to(extra.children[0].position,0.5,{y:-400,ease:Sine.easeIn,onComplete:function(){
        extra.rotation.y = 0;
        if( extra && extra.parent ) {
          extra.parent.remove(extra);
        }
      }})
    }
  }
  else {
    if( extra && extra.parent ){
      extra.parent.remove(extra);
    }
  }


}

function removeObstacle(obstacle){
  debug('remove obstacle');

  TweenMax.to(obstacle.scale,0.4,{z:0.01,ease:Sine.easeIn,onComplete:function(){
    if( obstacle && obstacle.parent ) {
      obstacle.parent.remove(obstacle);
    }

    obstacle.geometry.dispose()
  }})
}

