var debug = require('debug')('renderer:3d:effects')
  , settings = require('../settings')
  , Geometry = require('../geometry')
  , BodyFlags = require('../geom-sim/body-flags')
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
  },

  puckBounced: function(){
    Materials.ghost.opacity = 1;
  },

  update: function(world,alpha){

    //create them
    /*var trailLength = this.puckTrails.length;
    if( trailLength == 0 || (this.puckTrails[trailLength-1].material.opacity < 0.26))
      for(var i=0; i <  this.env.pucks.length; i++){
        var puck = this.env.pucks[i]
          , mesh = this.puckTrailPool.getObject();
        mesh.position = puck.position.clone()
        mesh.position.y = settings.data.puckRadius;
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
      // if( BodyFlags.has(puckBody,BodyFlags.GHOST) ) {
      //   puckMesh.material.opacity = puckMesh.material.opacity ? 0 : 1;
      // } else {
      //   puckMesh.material.opacity = 1;
      // }

      // fire (1=turn on, 2=turn off, undefined/0=ignore)
      if( puckBody.data.fireball )
        puckBody.data.fireball = toggleEffect(puckMesh,this.fireSkin,puckBody.data.fireball)

      // ghost (1=turn on, 2=turn off, undefined/0=ignore)
      if( puckBody.data.ghostball )
        puckBody.data.ghostball = toggleEffect(puckMesh,this.ghostSkin,puckBody.data.ghostball)
    }

    if( world.paddles.length ){
      // fireball for player a paddle (a === me??)
      var paddleBody = world.paddles.get(world.players.a.paddle)
      if( paddleBody.data.fireball ){
        var paddleMesh = this.renderer.players.me.paddle;
        paddleBody.data.fireball = toggleEffect(paddleMesh,this.fireSkin,paddleBody.data.fireball);
      }

      // fireball for player b paddle (b === opponent??)
      var paddleBody = world.paddles.get(world.players.b.paddle)
      if( paddleBody.data.fireball ){
        var paddleMesh = this.renderer.players.opponent.paddle;
        paddleBody.data.fireball = toggleEffect(paddleMesh,this.fireSkin,paddleBody.data.fireball);
      }
    }

    var showFog = world.activeExtras.has('fog')

    // check fog frame
    if( showFog ){

      var fogObj = world.activeExtras.get('fog')

      // has it started?
      if( world.frame < fogObj.start ){
        showFog = false

      // has it ended?
      } else if( world.frame > fogObj.end ){
        world.activeExtras.del('fog')
        showFog = false
      }
    }

    var amount = Materials.fog.uniforms.amount.value;
    if( showFog ) {
      if( amount < 0 ) {
        this.arena.add( this.fog );
        amount = 0;
      }
      else if( amount < 1) {
        amount += 0.02;
      }
    }
    else {
      //remove fog
      if( amount > 0 ) {
        amount -= 0.02;
      }
      else {
        this.arena.remove( this.fog );
        amount = -1;
      }
    }

    Materials.fog.uniforms.amount.value = amount;
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

    var r = settings.data.puckRadius;
    var puckGeo = new THREE.CubeGeometry( r*2,r*2,r*2 )
      , puckMat = new THREE.MeshLambertMaterial( { transparent:true, depthWrite:false,color: settings.theme.puckColor})
      , puckMesh = new THREE.Mesh( puckGeo, puckMat );
    puckMesh.name = 'puck'

    return puckMesh;

  }.bind(this)

  return puckTrailPool;

}
