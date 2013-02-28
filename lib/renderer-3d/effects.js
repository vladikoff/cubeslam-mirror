var debug = require('debug')('renderer:3d:effects')
  , settings = require('../settings')
  , Geometry = require('../geometry')
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

  puckBounced: function(){
    Materials.ghost.opacity = 1;
  },

  update: function(world,alpha){
    // no need to fun effects if game is not running?
    if( world.state !== 'playing' )
      return;

    //create them
    /*var trailLength = this.puckTrails.length;
    if( trailLength == 0 || (this.puckTrails[trailLength-1].material.opacity < 0.26))
      for(var i=0; i <  this.env.pucks.length; i++){
        var puck = this.env.pucks[i]
          , mesh = this.puckTrailPool.getObject();
        mesh.position = puck.position.clone()
        mesh.position.y = settings.data.unitSize*.5;
        mesh.scale.set(1,1,1)
        mesh.material.opacity = 0.3;
        this.arena.add(mesh);
        this.puckTrails.push(mesh);
      }


    //update them
    for (var i = this.puckTrails.length - 1; i >= 0; i--) {
      var trailMesh = this.puckTrails[i];
      trailMesh.material.opacity -= 0.01;
     // if(trailMesh.scale.x > 0) trailMesh.scale.addScalar(-0.01);
      if( trailMesh.material.opacity < 0.001 ) {
        this.arena.remove( trailMesh );
        this.puckTrailPool.returnObject(trailMesh.poolId);
        this.puckTrails.splice(i,1);
      }
    };*/

    for (var i = world.pucks.values.length - 1; i >= 0; i--) {
      var puckBody = world.pucks.values[i]
        , puckMesh = this.env.pucks.get(puckBody.index);

      // physics ghost blink (not used at the moment)
      if( BodyFlags.has(puckBody,BodyFlags.GHOST) ) {
        puckBody.data.blinkAmount += 0.25;
        if( puckBody.data.blinkAmount > 1 ) puckBody.data.blinkAmount = 0.1;
        
        var hsv = puckMesh.material.color.getHSV();
        puckMesh.material.color.setHSV(hsv.h,hsv.s,0.7 + puckBody.data.blinkAmount*0.6)

      } else {
        if( puckBody.data.blinkAmount > 0 ) {
          puckMesh.material.color.set(settings.theme.puckColor);
          puckBody.data.blinkAmount = 0
        }
      }

      // fire (1=turn on, 2=turn off, undefined/0=ignore)
      if( puckBody.data.fireball )
        puckBody.data.fireball = toggleEffect(puckMesh,this.fireSkin,puckBody.data.fireball)

      // ghost (1=turn on, 2=turn off, undefined/0=ignore)
      if( puckBody.data.ghostball )
        puckBody.data.ghostball = toggleEffect(puckMesh,this.ghostSkin,puckBody.data.ghostball)

      // bomb (1=turn on, 2=turn off, undefined/0=ignore)
      //check for explosion
      if( settings.data.debugTimebomb ) puckBody.data.timebomb = 1
      else if( puckBody.data.timebomb ) puckBody.data.timebomb = 2

      if( puckBody.data.timebomb)
        puckBody.data.timebomb = toggleEffect(puckMesh,this.bombSkin,puckBody.data.timebomb)
    }

    var showFog = false;
    if( world.paddles.length ){
      var paddleBody = world.paddles.get(world.players.a.paddle)
      if( paddleBody.data.fireball ){
        var paddleMesh = this.renderer.players.me.paddle;
        paddleBody.data.fireball = toggleEffect(paddleMesh,this.fireSkin,paddleBody.data.fireball);
      }
      if( paddleBody.data.fog ) {
        showFog = true
        this.fog.rotation.y = Math.PI;
      }

      // fireball for player b paddle (b === opponent??)
      var paddleBody = world.paddles.get(world.players.b.paddle)
      if( paddleBody.data.fireball ){
        var paddleMesh = this.renderer.players.opponent.paddle;
        paddleBody.data.fireball = toggleEffect(paddleMesh,this.fireSkin,paddleBody.data.fireball);
      }
      if( paddleBody.data.fog ) {
        showFog = true;
        this.fog.rotation.y = 0;

      }
    }

    var amount = Materials.fog.uniforms.amount.value;
    if( showFog ){
      if( amount < 0 ) {
        this.arena.add( this.fog );
        amount = 0;
      }
      else if( amount < 1) {
        amount += 0.02;
      }
    } else {
      if( amount > 0 ) {
        amount -= 0.02;
      }
      else {
        this.arena.remove( this.fog );
        amount = -1;
      }
    }
    Materials.fog.uniforms.amount.value = amount;

    //bullet proof
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

  var allSlices = new THREE.Geometry();
  var sliceGeo = new THREE.PlaneGeometry(settings.data.arenaWidth, settings.data.arenaSideHeight, 1,1);
  var totalSlices = 70;
  var sliceDist = settings.data.arenaHeight*.5/totalSlices;
  var tempMesh = new THREE.Mesh(sliceGeo,null);
  for (var i = totalSlices-2; i >= 0; i--) {
    tempMesh.position.y = settings.data.arenaSideHeight*.5;
    tempMesh.position.z = -i*sliceDist-sliceDist;
    THREE.GeometryUtils.merge(allSlices,tempMesh);
  };

  var sliceMesh = new THREE.Mesh(allSlices, Materials.fog );

  return sliceMesh;
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
