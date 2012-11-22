var settings = require('../settings')
  , Geometry = require('../geometry')
  , SimplexNoise = require('./simplex-noise')
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
  this.center = new THREE.Vector3(0,0,0);
  this.arena = createArena(renderer)


  this.terrain = createTerrain(renderer)
  this.animales = createAnimals(renderer)
  this.paddleSetup = createPaddleSetup(renderer,this.terrain)
  this.lights = createLights(this.terrain)
  this.icons = createIcons(renderer)
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
      this.extras.push(createExtra(this.arena, world, this.icons, world.extras[2+i]));
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

function createPaddleSetup(renderer,terrain){
  debug('create paddle setup')

  var geo = new THREE.CubeGeometry(900,600,50,1,1,1,renderer.materials.paddleSetupBox);
  var paddleSetupBox = new THREE.Mesh( geo, new THREE.MeshFaceMaterial());
  paddleSetupBox.position.set(-2000,100,470)
  paddleSetupBox.rotation.y = Math.PI*-.10;
  terrain.add(paddleSetupBox)

  var foundationGeo = new THREE.CubeGeometry(960,200,110,1,1,1);
  var foundationMesh = new THREE.Mesh(foundationGeo,renderer.materials.arenaSideColorMaterial)
  foundationMesh.position.set(-2000,-80,470)
  foundationMesh.rotation.y = Math.PI*-.10;
  terrain.add(foundationMesh)


  var colorPreviewGeo = new THREE.CubeGeometry(140,140,140,1,1,1);
  var colorPreviewBox = new THREE.Mesh(colorPreviewGeo,renderer.materials.colorPreview)
  colorPreviewBox.position.set(-2300,0,670)
  terrain.add(colorPreviewBox);

  return paddleSetupBox;
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
  var bottomGeo = new THREE.PlaneGeometry(w,d,10,10)
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

  //construct pit walls

  var sideGeoPart = new THREE.CubeGeometry(10,sideH,boxDepth,1,1,1);
  var finalGeo = new THREE.Geometry();

  //a:left wall
  var tempMesh = new THREE.Mesh(sideGeoPart, renderer.materials.arenaBorder );
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
  tempMesh = new THREE.Mesh(bottomGeoPart, renderer.materials.arenaBorder );
  tempMesh.position.set(0,sideH*.5,d*.5+boxDepth)
  THREE.GeometryUtils.merge(finalGeo, tempMesh);

  //b:bottom wall
  tempMesh = new THREE.Mesh(bottomGeoPart, renderer.materials.arenaBorder );
  tempMesh.position.set(0,sideH*.5,-d*.5-boxDepth)
  THREE.GeometryUtils.merge(finalGeo, tempMesh);

  var finalMesh = new THREE.Mesh(finalGeo, renderer.materials.arenaBorder );
  arena.add(finalMesh);


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

  var reflectionBoxGeo = new THREE.CubeGeometry(w,1000,d,1,1,1,null, { px: true, nx: true, py: false, ny: true, pz: true, nz: true });
  var blackBottomMesh = new THREE.Mesh( reflectionBoxGeo, renderer.materials.reflectionBox);
  blackBottomMesh.position.y = -500;
  arena.add(blackBottomMesh);

  return arena;
}


function createLights(terrain){
  debug('create lights')
  var lights = [];

  var ambLight = new THREE.AmbientLight(0x222222,0);
  terrain.add(ambLight)
  lights.push(ambLight)

  //var hemLight = new THREE.HemisphereLight(0xe5e4c6, 0xeeeeee,0.6);
  var hemLight = new THREE.HemisphereLight(0x076fc8, 0xeeeeee,0.7);
  terrain.add(hemLight)
  lights.push(hemLight)

  var pointLight = new THREE.PointLight( 0xFFFFFF,1.2,2000 );
  pointLight.position = new THREE.Vector3(0,500,0);
  terrain.add(pointLight);
  lights.push(pointLight)

  var dirLight = new THREE.DirectionalLight(0xffffff,1.0);
  dirLight.color.setHSV( 0.1, 0.1, 1 );
  dirLight.position.set( 0.5, .75, 0.5 );
  dirLight.position.multiplyScalar( 50 );
  terrain.add(dirLight);
  lights.push(dirLight)

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
    , n = 0;

  // offset and change color
  for (var i = 0; i < len; i++) {
    var point = geometry.vertices[i]

    var uvY = 1-((point.z / 4500) + 0.5);
    var uvX = point.x/3000

   /* n = noise.noise(uvX *2*2, uvY*2 )//+ noise.noise(point.x / 2000 *3, point.y / w*.5 * 14) * uvX;
    n = Math.abs(n);

    point.y = n * 200 * (Math.abs(uvX*uvX)) * (uvY) - (uvY+0.3)*400// + n*400*((1-Math.abs(uvX))*(uvY))
*/
    point.y -= 50 + 200*uvY;
    // attach edge to left/right of arena
    if( i == 43 || i == 51 || i ==35 || i == 27 ) {
      point.x = settings.data.arenaWidth*-.5-5;
      point.y = settings.data.arenaSurfaceY+settings.data.arenaSideHeight;
    }
    else if( i ==28 || i == 37 || i==45 || i == 53  ) {
      point.x = settings.data.arenaWidth*.5+5;
      point.y = settings.data.arenaSurfaceY+settings.data.arenaSideHeight;
    }

    if(i == 105) {
      point.y = settings.data.arenaSurfaceY+settings.data.arenaSideHeight;
    }

    //set z-points to edge
    if( i == 28 || i == 27 || i == 105) {
      point.z = settings.data.arenaHeight*.5 + settings.data.videoBoxDepth+5;
    }
    else if(i==51 || i == 53) {
      point.z = -settings.data.arenaHeight*.5 - settings.data.videoBoxDepth-5;
    }
  }

  geometry.computeFaceNormals();
  geometry.computeCentroids();

  var terrain = new THREE.Object3D();
  renderer.container.add(terrain);

  var terrainMat = new THREE.MeshLambertMaterial( {color:0x4d87dc, wireframe:false, shading:THREE.FlatShading });
  var terrainMesh = new THREE.Mesh(geometry,terrainMat)
  terrainMesh.position.z = 0;
  terrain.terrainShortcut = terrainMesh;
  terrain.add(terrainMesh);

  //distant terrain
  terrainMesh = createTerrainMesh(6000,2000,2505,20,20,new THREE.Color( 0x3968cc ),4,false)
  terrainMesh.position.z = -5500;
  terrainMesh.position.x = Math.random()*5000-2500;
  terrainMesh.position.y = settings.data.arenaSurfaceY-settings.data.arenaSideHeight;
  terrainMesh.scale.x = 4;
  terrainMesh.scale.y = 4;
  terrain.add(terrainMesh);

  terrainMesh = createTerrainMesh(4000,3000,8505,10,15,new THREE.Color( 0x2548c9 ),4,false)
  terrainMesh.position.z = -5000;
  terrainMesh.position.x = Math.random()*5000-2500;
  terrainMesh.position.y = settings.data.arenaSurfaceY-settings.data.arenaSideHeight;
  terrainMesh.scale.x = 3;
  terrain.add(terrainMesh);

  createForrest(renderer,terrain)

  return terrain;
}



function createTerrainMesh( w, h, extrude, segW, segH, baseColor, noiseFactor, bValley ){
  var noise = new ImprovedNoise()
    , n = 0
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


    n = noise.noise((uvX+0.5)*noiseFactor, uvY*noiseFactor, z ) + noise.noise((uvX+0.5)*noiseFactor*3, uvY*noiseFactor*3, 0 )*0.2
    
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

  var natureMaterial = new THREE.MeshLambertMaterial( {color:baseColor, wireframe:false, shading:THREE.FlatShading })
  var mountainMesh = new THREE.Mesh(geometry, natureMaterial)
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
  var trunkMesh = new THREE.Mesh( trunkGeo, renderer.materials.treeTrunk );
  var shapeMesh = new THREE.Mesh( shapeGeo, renderer.materials.treeBranches );
  var shadowMesh = new THREE.Mesh( shadowPlaneGeo, renderer.materials.terrainShadow );
  var noise = new ImprovedNoise()


  var gridX = 100; 
  var gridY = 100; 

  for (var px = gridX - 1; px >= 0; px--) {
    for (var py = gridY - 1; py >= 0; py--) {
      var uvX = px/gridX - .5;
      var uvY = py/gridY - .5;

      //TODO Prevent trees to grow at the paddle-setup-screen

      if( (uvX > -0.2 && uvX < 0.2 && uvY > -0.4 && uvY < 0.4) || (uvX < 0 && uvY > 0) ) continue;

      var n = noise.noise((uvX+0.5)*5, (uvY+0.5)*5,Math.random()*10 );


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

  var forrestMesh = new THREE.Mesh(mergeGeometry,renderer.materials.treeBranches);
  terrain.terrainShortcut.add(forrestMesh);

  var shadowsMesh = new THREE.Mesh(mergeShadowGeometry,renderer.materials.terrainShadow);
  terrain.terrainShortcut.add(shadowsMesh);

}

function createAnimals(renderer) {
  var geometry = Geometry.animal_moose;
  //geometry.computeCentroids();
  var mooseMesh = new THREE.Mesh(geometry, renderer.materials.genericAnimal )
  mooseMesh.position.set(-2000,-50,1300);
  mooseMesh.rotation.y=Math.PI;
  mooseMesh.scale.set(2,2,2)
  renderer.container.add(mooseMesh);
}

function createIcons(renderer){
  var icons = {};

  // change this when extra-list is refactored
  var tempColors = {
    "extraball": 0xe72921,
    "speedball": 0xffffff
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
    var iconMat = renderer.materials.icon.clone();
    iconMat.uniforms.color.value.setHex( tempColors[iconType] );

    // get geometry
    var iconGeo = Geometry[iconType];
    if( !iconGeo )
      throw new Error('geometry not found for '+iconType)

    var iconMesh = new THREE.Mesh( iconGeo, iconMat) ;
    iconMesh.scale.set(4,4,4);
    iconMesh.position.y = 20;

    var iconMirrorMesh = new THREE.Mesh( iconGeo, iconMat) ;
    iconMirrorMesh.position.y = -20;
    iconMirrorMesh.scale.set(1,-1,1);
    iconMesh.add(iconMirrorMesh);

    //white circle
    var circleGeo = new THREE.PlaneGeometry(50,50,1,1);
    var circleMesh = new THREE.Mesh(circleGeo, renderer.materials.iconCircle);

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
function createExtra(arena, world, icons, extra){
  debug('create extra')
  // TODO use settings for size instead, and don't pass around world
  var w = (world.bounds.r-world.bounds.l)
    , h = (world.bounds.b-world.bounds.t)

  // extra has an icon
  if( extra.icon && icons[extra.icon] ){
    // TODO don't assume its a rect...
    var x = extra.r - extra.width/2
      , y = extra.b - extra.height/2;

    var icon = icons[extra.icon];
    icon.position.x = (x*w-w/2);
    icon.position.z = (y*h-h/2);

    arena.add(icon);
    return icon;

  // extra is a polygon
  } else if( extra.vertices ){
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

