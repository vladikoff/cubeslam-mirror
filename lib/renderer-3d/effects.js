var debug = require('debug')('renderer:3d:effects')
  , settings = require('../settings')
  , Geometry = require('./geometry')
  , BodyFlags = require('../sim/body-flags')
  , ObjectPool = require('./object-pool')
  , EffectSkins = require('./effect-skins')
  , Materials = require('./materials');

module.exports = Effects;

// Effects
//   - puckTrails[]
//   #update(world)

function Effects(renderer, env ){
  debug('new')
  this.renderer = renderer;
  this.env = env;
  this.arena = env.arena;
  // this.puckTrailPool = createPuckTrailPool();
  // this.puckTrails = []
  this.fog = createFog(renderer, env );

  this.fireSkin = new EffectSkins.fire()
  this.ghostSkin = new EffectSkins.ghost()
  this.bombSkin = new EffectSkins.bomb()
  this.laserSkin = new EffectSkins.laser()

  //temp variable for testing
  this.deathballActive = false;
  this.defaultTheme = null;

  this.extraActivateMesh = createExtraActivateMesh()


}

Effects.prototype = {

  reset: function(){
    debug('reset')

    // for (var i = this.puckTrails.length - 1; i >= 0; i--) {
    //   trailMesh = this.puckTrails[i];
    //   this.arena.remove( trailMesh );
    //   this.puckTrailPool.returnObject(trailMesh.poolId);
    //   this.puckTrails.splice(i,1);

    // };

    this.ghostSkin.detach()
    this.fireSkin.detach()
    this.bombSkin.detach()
    this.laserSkin.detach()

    //temp: clean up after deathball
    this.deathballActive = false;

  },

  activateExtra: function( extra, puck ){


    var w = settings.data.arenaWidth
      , h = settings.data.arenaHeight
      , hw = w*.5
      , hh = h*.5;

    this.extraActivateMesh.position.x = puck.current[0] - hw;
    this.extraActivateMesh.position.z = puck.current[1] - hh;

    this.arena.add(this.extraActivateMesh);

    this.extraActivateMesh.scale.set(1,1,1)

    Materials.extraActivate.opacity = 0.5;

    TweenMax.to(Materials.extraActivate,0.3,{opacity:0,ease:Sine.easeOut})

    TweenMax.killTweensOf(this.extraActivateMesh.scale);
    TweenMax.to(this.extraActivateMesh.scale,0.3,{x:4,y:4,z:4,ease:Linear.noEase, onComplete:function(){
      if( this.extraActivateMesh.parent ) this.arena.remove(this.extraActivateMesh);
    }.bind(this)})
  },

  toggleDeathball: function( active){
    if( active ) {
      this.defaultTheme = settings.theme;
      var theme = {

        treeTrunkColor: 0x206cc3,
        shieldColor: 0xffffff,
        puckColor: 0xefce06,
        arenaColor: 0x462b2b,
        cpuBackdropColor: 0xff0000,
        terrainColor1: 0x2a2a2a,
        terrainColor2: 0x222222,
        terrainColor3: 0x000000,
        treeBranchColor: 0x131313,
        iconColor: 0x000000,
        gridBrightness:0.4
      }

      settings.changeTheme(theme)
    }
    else {
      settings.changeTheme(this.defaultTheme)
    }


  },

  toggleFog: function( active, mirror ){
    if( active ) {

      this.fog.rotation.z =(mirror==1)?Math.PI:0;
      this.arena.add( this.fog );
      TweenMax.to(this.fog.position,2,{y:settings.data.arenaSideHeight})
      TweenMax.to(Materials.fog2,2,{opacity:1})
    }
    else if( this.fog.parent ){
      TweenMax.to(this.fog.position,2,{y:0})
      TweenMax.to(Materials.fog2,2,{opacity:0, onComplete:function(){
        if( this.fog.parent )
        this.arena.remove( this.fog );
      }.bind(this)})
    }
  },

  puckBounced: function(){
    Materials.ghost.opacity = 1;
  },

  update: function(world,alpha){
    // no need to fun effects if game is not running?
    if( world.state !== 'playing' )
      return;

    for (var i = world.pucks.values.length - 1; i >= 0; i--) {
      var puckBody = world.pucks.values[i]
        , puckMesh = this.env.pucks.get(puckBody.index);

      // physics ghost blink (not used at the moment)
      if( BodyFlags.has(puckBody,BodyFlags.GHOST) ) {
       puckBody.data.blinkAmount += 0.5;
        //do each 2:nd frame
        if( puckBody.data.blinkAmount > 0.8 ) {
          puckBody.data.blinkAmount = 0;
          puckMesh.material.color.set( (puckMesh.material.color.getHex() === 0xffda00)? 0xfcf4c8:0xffda00)
        }
      } else {
        puckMesh.material.color.set(0xffda00);
      }

      // fire (1=turn on, 2=turn off, undefined/0=ignore)
      if( puckBody.data.fireball )
        puckBody.data.fireball = toggleEffect(puckMesh,this.fireSkin,puckBody.data.fireball)

      // ghost (1=turn on, 2=turn off, undefined/0=ignore)
      if( puckBody.data.ghostball )
        puckBody.data.ghostball = toggleEffect(puckMesh,this.ghostSkin,puckBody.data.ghostball)

      // bomb (1=turn on, 2=turn off, undefined/0=ignore)
      if( puckBody.data.timebomb )
        puckBody.data.timebomb = toggleEffect(puckMesh,this.bombSkin,puckBody.data.timebomb)
    }


    if( world.paddles.length ){
      // effects for player a paddle (b === me??)
      var paddleBody = world.paddles.get(world.players.a.paddle)
      if( paddleBody.data.fireball ){
        var paddleMesh = this.renderer.players.me.paddle;
        paddleBody.data.fireball = toggleEffect(paddleMesh,this.fireSkin,paddleBody.data.fireball);
      }
      if( paddleBody.data.laser && !this.laserSkin.isActive ){
        var paddleMesh = this.renderer.players.me.paddle;
        paddleBody.data.laser = toggleEffect(paddleMesh,this.laserSkin,paddleBody.data.laser);
      }
      else if( this.laserSkin.isActive ){
        toggleEffect(paddleMesh,this.laserSkin,paddleBody.data.laser);
      }
      

      // effects for player b paddle (b === opponent??)
      var paddleBody = world.paddles.get(world.players.b.paddle)
      if( paddleBody.data.fireball ){
        var paddleMesh = this.renderer.players.opponent.paddle;
        paddleBody.data.fireball = toggleEffect(paddleMesh,this.fireSkin,paddleBody.data.fireball);
      }
     
      if( paddleBody.data.laser && !this.laserSkin.isActive ){
        var paddleMesh = this.renderer.players.opponent.paddle;
        paddleBody.data.laser = toggleEffect(paddleMesh,this.laserSkin,paddleBody.data.laser);
      }
      else if( this.laserSkin.isActive ){
        toggleEffect(paddleMesh,this.laserSkin,paddleBody.data.laser);
      }
    


    }

    // bullet proof
    for (var i = world.shields.values.length - 1; i >= 0; i--) {
      var shieldBody = world.shields.values[i]
        , shieldMesh = this.env.shields.get(shieldBody.index);

      if( !shieldMesh ){
        console.log('no shield with index %s found',shieldBody.index)
        continue;
      }

      if( shieldBody.data.bulletproof && shieldMesh.material.opacity <= 0.7) {
        shieldMesh.material.opacity += 0.05;
      }
      else if( !shieldBody.data.bulletproof && shieldMesh.material.opacity >= 0.25) {
        shieldMesh.material.opacity -= 0.05;
      }
    }
  }

}

// toggleEffect (state: 1=turn on, 2=turn off, undefined/0=none)
function toggleEffect(mesh,skin,state){
  if( state === 1 && !skin.isActive ) {
    skin.attachToMesh(mesh)
    return state;
  }
  else if( state === 2 && skin.isActive ) {
    skin.detach()
    return 0; // set state back to 0
  }
  else if( skin.isActive ) {
    skin.update();
    return state;
  }
}

function createFog( renderer, env) {

  var ah = settings.data.arenaHeight,
      hh = ah*.5,
      aw = settings.data.arenaWidth,
      hw = aw*.5;

/*  var allSlices = new THREE.Geometry();
  var sliceGeo = new THREE.PlaneGeometry(settings.data.arenaWidth, settings.data.arenaSideHeight, 1,1);
  var totalSlices = 45;
  var sliceDist = ah/totalSlices;
  var tempMesh = new THREE.Mesh(sliceGeo,null);
  for (var i = totalSlices-2; i >= 0; i--) {
    tempMesh.position.y = settings.data.arenaSideHeight*.5;
    tempMesh.position.z = (-i*sliceDist-sliceDist) + hh;
    THREE.GeometryUtils.merge(allSlices,tempMesh);
  };

  var sliceMesh = new THREE.Mesh(allSlices, Materials.fog );
*/

  var mesh = new THREE.Mesh(new THREE.PlaneGeometry( aw-5, ah-40, 1, 1 ), Materials.fog2 );
  mesh.rotation.x = Math.PI*-.5;
  mesh.position.y = 0

  var sideMesh = new THREE.Mesh(new THREE.PlaneGeometry( aw-5, settings.data.arenaSideHeight*2, 1, 1 ), Materials.fog2 );
  sideMesh.position.y = hh-20
  sideMesh.position.z = -settings.data.arenaSideHeight;
  sideMesh.rotation.x = Math.PI*.5;
  mesh.add(sideMesh)

  sideMesh = new THREE.Mesh(new THREE.PlaneGeometry( aw-5, settings.data.arenaSideHeight*2, 1, 1 ), Materials.fog2 );
  sideMesh.position.y = -(hh-20);
  sideMesh.position.z = -settings.data.arenaSideHeight
  sideMesh.rotation.x = Math.PI*-.5;
  mesh.add(sideMesh)

  return mesh;
}

function createPuckTrailPool() {
  var puckTrailPool = new ObjectPool();

  puckTrailPool.createObject = function(){

    var puckGeo = new THREE.CubeGeometry( settings.data.unitSize,settings.data.unitSize,settings.data.unitSize )
      , puckMat = new THREE.MeshLambertMaterial( { transparent:true, depthWrite:false,color: settings.theme.puckColor})
      , puckMesh = new THREE.Mesh( puckGeo, puckMat );
    puckMesh.name = 'puck'

    return puckMesh;

  }.bind(this)

  return puckTrailPool;

}

function createExtraActivateMesh() {

  var geo = new THREE.CubeGeometry( settings.data.unitSize,settings.data.unitSize,settings.data.unitSize,1,1,1);
  geo.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(0,settings.data.unitSize*.5, 0)));

  var cube = new THREE.Mesh(geo, Materials.extraActivate);

  return cube;
}
