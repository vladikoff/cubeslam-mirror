var settings = require('../settings')
  , Geometry = require('../geometry')
  , debug = require('debug')('renderer:3d:env');


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
  this.center = new THREE.Vector3(0,-300,0);
  this.arena = createArena(renderer)
  this.lights = createLights(renderer)
  this.terrain = createTerrain(renderer)
  this.extras = []
  this.forces = []
  this.pucks = []
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
  },


  update: function(world,alpha){
    // TODO add in "icons" (rename world.obstacles to world.extras and flag extras as icons)
    // TODO pool pucks/forces/extras, or at least pre-instantiate
    // TODO remove pucks
    // TODO remove forces 
    // TODO remove extras
    // TODO instead of world.bounds we should probably just use settings?
    var fw = (world.bounds.r-world.bounds.l)
      , fh = (world.bounds.b-world.bounds.t)
      , hw = fw/2
      , hh = fh/2;

    // create pucks
    for(var i=this.pucks.length; i < world.pucks.length; i++ )
      this.pucks.push(createPuck(this.arena))

    // create forces
    for(var i=this.forces.length; i < world.forces.length; i++ )
      this.forces.push(createForce(this.arena, world, world.forces[i]));

    // create extras
    for(var i=this.extras.length; i < world.extras.length-2; i++ ) { // -2 for paddles
      this.extras.push(createExtra(this.arena, world, world.extras[2+i]));
    }

    // update pucks 
    for(var i=0; i < world.pucks.length; i++){
      var puck = world.pucks[i]
        , mesh = this.pucks[i];
      mesh.position.x = puck.current.x*fw-hw;
      mesh.position.z = puck.current.y*fh-hh;

      if( mesh.material.color.getHex() != settings.data.puckColor)
        mesh.material.color.setHex( settings.data.puckColor );
    }

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
  arena.position.y = settings.data.arenaSurfaceY;
  renderer.container.add(arena);

  // boundingbox
  var bottomGeo = new THREE.PlaneGeometry(w,d,1,1)
    , bottomMesh = new THREE.Mesh( bottomGeo, renderer.materials.arenaTransMaterial );
  bottomMesh.rotation.x = Math.PI*1.5;
  arena.add(bottomMesh);
  arena.bottomMesh = bottomMesh;

  var sideGeo = new THREE.CubeGeometry(10,sideH,d,1,1,1,renderer.materials.arenaSideMaterials);

  var rightMesh = new THREE.Mesh(sideGeo, renderer.materials.arenaSideFaces );
  rightMesh.position.x = hw;
  rightMesh.position.y = sideH*.5
  rightMesh.rotation.y = Math.PI;
  arena.add(rightMesh);
  arena.rightMesh = rightMesh;

  var leftMesh = new THREE.Mesh(sideGeo, renderer.materials.arenaSideFaces);
  leftMesh.position.x = -hw;
  leftMesh.position.y = sideH*.5;
  arena.add(leftMesh);
  arena.leftMesh = leftMesh;

  var centerLineGeo = new THREE.PlaneGeometry(18,sideH+1,1,1 );
  var centerLineMesh = new THREE.Mesh(centerLineGeo,renderer.materials.centerLine)
  centerLineMesh.position.x = 5.2;
  centerLineMesh.rotation.y = Math.PI*.5;
  arena.leftMesh.add(centerLineMesh);

  var centerLineMesh2 = new THREE.Mesh(centerLineGeo,renderer.materials.centerLine);
  centerLineMesh2.position.x = 5.2;
  centerLineMesh2.rotation.y = -Math.PI*.5;
  arena.rightMesh.add(centerLineMesh2);

  //table
  var table = new THREE.Mesh( new THREE.PlaneGeometry(w,d,1,1), renderer.materials.arenaGrid);
  table.rotation.x = -Math.PI*.5
  table.position.y = 2;
  arena.add(table);

  var reflectionBoxGeo = new THREE.CubeGeometry(w,200,d,1,1,1,null, { px: true, nx: true, py: false, ny: true, pz: true, nz: true });
  var blackBottomMesh = new THREE.Mesh( reflectionBoxGeo, renderer.materials.reflectionBox);
  blackBottomMesh.position.y = -100;
  arena.add(blackBottomMesh);

  return arena;
}


function createLights(renderer){
  debug('create lights')
  var lights = [];

  var ambLight = new THREE.AmbientLight(0x222222,0);
  renderer.scene.add(ambLight)
  lights.push(ambLight)

  var hemLight = new THREE.HemisphereLight(0xe5e4c6, 0xeeeeee,0.6);
  renderer.scene.add(hemLight)
  lights.push(hemLight)

  var pointLight = new THREE.PointLight( 0xFFFFFF,0.6,2000 );
  pointLight.position = new THREE.Vector3(0,1000,0);
  renderer.scene.add(pointLight);
  lights.push(pointLight)

  // var pointLight2 = new THREE.PointLight( 0xFFFFFF , 0.3, 2000 );
  // pointLight2.position = this.camera.position.clone();
  // pointLight2.position.x += 40;
  //this.scene.add(pointLight2);

  var dirLight = new THREE.DirectionalLight(0xe8e8d0,1);
  dirLight.color.setHSV( 0.1, 0.1, 1 );
  dirLight.position.set( 0.5, .75, 0.5 );
  dirLight.position.multiplyScalar( 50 );
  renderer.scene.add(dirLight);
  lights.push(dirLight)

  return lights;
}


function createTerrain(renderer){
  debug('create terrain')
  var geometry = Geometry.terrain1;

  // close terrain      
  var noise = new SimplexNoise()
    , len = geometry.vertices.length
    , h = 1000
    , n = 0;

  // offset and change color
  for (var i = 0; i < len; i++) {
    var point = geometry.vertices[i]

    var uvY = 1-((point.z / 5000) + 0.5);
    var uvX = point.x/3000

    n = noise.noise(uvX *2*2, uvY*2 )//+ noise.noise(point.x / 2000 *3, point.y / w*.5 * 14) * uvX;
    n = Math.abs(n);
    
    point.y = n * 200 * (Math.abs(uvX*uvX)) * (uvY) - (uvY+0.3)*400// + n*400*((1-Math.abs(uvX))*(uvY))

    // attach edge to arena
    if( i == 43 || i == 51 || i ==35 || i == 27 ) {
      point.x = settings.data.arenaWidth*-.5-5;
      point.y = settings.data.arenaSurfaceY+settings.data.arenaSideHeight;
    }
    else if( i ==28 || i == 37 || i==45 || i == 53   ) {
      point.x = settings.data.arenaWidth*.5+5;  
      point.y = settings.data.arenaSurfaceY+settings.data.arenaSideHeight;
    }
  }

  geometry.computeFaceNormals();

  var terrain = new THREE.Object3D();
  renderer.container.add(terrain);

  var terrainMat = new THREE.MeshLambertMaterial( {color:0x1a99db, wireframe:false, shading:THREE.FlatShading });
  var terrainMesh = new THREE.Mesh(geometry,terrainMat)
  terrainMesh.position.z = 0;
  terrain.add(terrainMesh);

  //distant terrain
  terrainMesh = createTerrainMesh(6000,2000,2205,20,20,new THREE.Color( 0x20759c ),1.4,false)
  terrainMesh.position.z = -6500;
  terrainMesh.position.x = Math.random()*5000-2500;
  terrainMesh.position.y = settings.data.arenaSurfaceY-settings.data.arenaSideHeight;
  terrainMesh.scale.x = 4;
  terrainMesh.scale.y = 4;
  terrain.add(terrainMesh);

  terrainMesh = createTerrainMesh(4000,3000,8205,10,10,new THREE.Color( 0x184d6f ),1,false)
  terrainMesh.position.z = -5000;
  terrainMesh.position.x = Math.random()*5000-2500;
  terrainMesh.position.y = settings.data.arenaSurfaceY-settings.data.arenaSideHeight;
  terrainMesh.scale.x = 3;
  terrain.add(terrainMesh);

  createForrest(renderer,terrain)

  return terrain;
}



function createTerrainMesh( w, h, extrude, segW, segH, baseColor, noiseFactor, bValley ){
  var noise = new SimplexNoise()
    , n = 0
    , faceIndices = [ 'a', 'b', 'c', 'd' ]
    , newColor = null
    , geometry = new THREE.PlaneGeometry(w,h,segW,segH)
    , len = geometry.vertices.length
    , hsvColor = baseColor.getHSV();

  // offset and change color
  for (var i = 0; i < len; i++) {
    var point = geometry.vertices[i]
    point.x += Math.random()*20;
    point.y += Math.random()*20;

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
}



function createForrest(renderer,terrain) {
  debug('create forrest')
  var trunkGeo = new THREE.CubeGeometry(20,100,10,1,1,1);
  var shapeGeo = new THREE.CylinderGeometry( 0, 80, 220, 4, 1 );
  var shadowPlaneGeo = new THREE.PlaneGeometry( 200,200,1,1);

  for ( var i = 0; i < 70; i ++ ) {
    var shapeMesh = new THREE.Mesh( shapeGeo, renderer.materials.treeBranches );
    shapeMesh.rotation.y = Math.PI*-.5;
    shapeMesh.position.y = 90;

    var trunkMesh = new THREE.Mesh( trunkGeo, renderer.materials.treeTrunk );
    trunkMesh.add(shapeMesh)
    trunkMesh.position.x = ( 1000 + Math.random() * 2000)*((Math.random()>.5)?-1:1);
    trunkMesh.position.y = settings.data.arenaSurfaceY;
    trunkMesh.position.z = -1000 + ( Math.random() - 0.5 ) * 2000;
    trunkMesh.updateMatrix();
    
    var scale = 0.7+Math.random()*0.7;
    trunkMesh.rotation.y = Math.random()
    trunkMesh.scale.set(scale,scale,scale)

    // shadow
    var shadowMesh = new THREE.Mesh( shadowPlaneGeo, renderer.materials.terrainShadow );
    shadowMesh.position.y = -50 //Math.random()*10;
    shadowMesh.rotation.x = -Math.PI*0.5;
    trunkMesh.add(shadowMesh);

    terrain.add(trunkMesh);
  }
}



function createForce(arena, world, force){
  debug('create force')
  // TODO use settings for size instead, and don't pass around world
  var fw = (world.bounds.r-world.bounds.l)
    , fh = (world.bounds.b-world.bounds.t)
    , hw = fw/2
    , hh = fh/2
    , fc = force.type == 'attract' ? 0x00ff00 : 0xff0000;

  // TODO *50 is not correct. what would be the proper scale in comparison to the puck?
  var forceGeo = new THREE.SphereGeometry( force.mass*50 ) 
    , forceMat = new THREE.MeshPhongMaterial({ opacity: 0.1, color: fc, transparent:true })
    , forceMesh = new THREE.Mesh( forceGeo, forceMat );
  forceMesh.position.x = (1-force.x)*fw-hw;
  forceMesh.position.z = force.y*fh-hh;
  arena.add(forceMesh);
  return forceMesh;
}

function removeForce(force){
  debug('remove force')
  if( force.parent )
    force.parent.remove(force);
}



function createPuck(arena){
  debug('create puck')
  var r = settings.data.puckRadius;
  var puckGeo = new THREE.CubeGeometry( r*2,r*4,r*2 )
    , puckMat = new THREE.MeshLambertMaterial( { color: settings.data.puckColor })
    , puckMesh = new THREE.Mesh( puckGeo, puckMat );
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
function createExtra(arena, world, extra){
  debug('create extra')
  // TODO use settings for size instead, and don't pass around world
  var w = (world.bounds.r-world.bounds.l)
    , h = (world.bounds.b-world.bounds.t)

  // extra is a polygon
  if( extra.vertices ){
    var shape = new THREE.Shape();
    var v = extra.vertices[0];
    shape.moveTo(v.x*w,v.y*h);
    for( var i=1; i < extra.vertices.length; i++ ){
      v = extra.vertices[i];
      shape.lineTo(v.x*w,v.y*h);
    }

    // TODO these should already have been created
    var shapeGeo = new THREE.ExtrudeGeometry( shape, { amount: 40 } )
      , shapeMat = new THREE.MeshLambertMaterial({shading: THREE.FlatShading, color:0xffffff})
      , shapeMesh = new THREE.Mesh( shapeGeo, shapeMat );

    shapeMesh.rotation.x = Math.PI/2 // 90°
    shapeMesh.position.y = 20;
    shapeMesh.position.x = -w/2;
    shapeMesh.position.z = -h/2;

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

