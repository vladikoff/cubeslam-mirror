var debug = require('debug')('renderer:3d:shield')
  , Materials = require('./materials')
  , pool = require('../support/pool')
  , dmaf = require('../dmaf.min')
  , settings = require('../settings')
  , raf = require('request-animation-frame')


module.exports = Shield;

var geom = new THREE.BoxGeometry(100,settings.data.arenaSideHeight,100,1,1,1,{ px: true, nx: true, py: true, ny: false, pz: true, nz: false })
geom.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(0, settings.data.arenaSideHeight*.5, 0)));


function Shield(){
}

Shield.prototype = {
  createMesh: function(){
    this.mesh = new THREE.Mesh( geom, Materials.shield.clone() );
    this.mesh.material.opacity = 0.8;
  },

  add: function(parent,body){

    this.body = body;

    if( !this.mesh ) this.createMesh();

    this.mesh.position.x = body.current[0] - settings.data.arenaWidth/2;
    this.mesh.position.z = body.current[1] - settings.data.arenaHeight/2;
    this.mesh.scale.x = (body.aabb[1] - body.aabb[3])/100
    this.mesh.scale.z = (body.aabb[2] - body.aabb[0])/100
    this.mesh.scale.y = 0.01;

    if(!this.mesh.parent) parent.add(this.mesh);

    dmaf.tell( "shields_reset_up");

    this.bulletproof = false;
    this.targetOpacity = 0.25;
    this.targetScale = 0.01;

    return this;
  },

  update: function(world){
    if(!this.mesh) {
      console.warn("shield not created yet");
      return;
    }

    var shields = world.players[this.body.data.player].shields;

    this.targetScale = shields[this.body.data.index]+0.01;

    this.mesh.scale.y += (this.targetScale-this.mesh.scale.y)*0.1;

    if( this.mesh.scale.y > 0.02 ) {
      this.mesh.visible = true;
    }

    if( this.body.data.bulletproof != this.bulletproof ) {
      if(this.body.data.bulletproof==1) {
        this.targetOpacity = 0.7

      } else{
        this.targetOpacity = 0.25;

      }
      this.bulletproof = this.body.data.bulletproof;
    }

    //aniate to targetOpacity
    if( Math.abs(this.mesh.material.opacity - this.targetOpacity)>0.01 ) {
      this.mesh.material.opacity += (this.targetOpacity-this.mesh.material.opacity)*0.2;
    }
  },

  reset: function(){
    if(this.bulletproof)
      this.targetOpacity = 0.7;

    this.animateOut();
    Shield.free(this);
  },

  remove: function( blownAway ){

    if( blownAway ) {
      this.mesh.material.color.set( 0xffa200 );
    }

    this.animateOut();
    Shield.free(this);
  },

  animateOut: function(){

    dmaf.tell( "shields_reset_down");
    this.mesh.material.opacity = 1;
    this.targetScale = 0.01;

    this.renderOut();
  },

  renderOut: function(){
    this.mesh.material.opacity += (0-this.mesh.material.opacity)*0.1;

    if( this.targetScale == 0.01 && Math.abs(this.targetScale - this.mesh.scale.y)<0.05) {
      this.mesh.visible = false;
      this.mesh.material.color.set( settings.theme.shieldColor );
    }
    else {
      this.mesh.scale.y += (this.targetScale-this.mesh.scale.y)*0.1;
      raf( this.renderOut.bind(this) )
    }
  }
}

pool(Shield, 18)