var debug = require('debug')('renderer:3d:bullet')
    , Materials = require('./materials')
    , pool = require('../support/pool')
    , settings = require('../settings')
    , raf = require('request-animation-frame')


module.exports = Bullet;

var geom = new THREE.PlaneGeometry( settings.data.arenaWidth/settings.data.arenaColumns,150 );
geom.applyMatrix( new THREE.Matrix4().rotateX( Math.PI*-0.5));

function Bullet(){
  this.mesh = new THREE.Mesh( geom, Materials.bullet );
}

Bullet.prototype = {
  add: function(parent,body){
    this.mesh.position.x = body.current[0]-settings.data.arenaWidth*0.5;
    this.mesh.position.z = body.current[1]-settings.data.arenaHeight*0.5;
    this.mesh.position.y = 4;

    parent.add(this.mesh);

    return this;
  },

  update: function(world,body){

    if(!this.mesh) {
      console.warn('bullet not created yet');
      return;
    }

    this.mesh.position.x = body.current[0] - settings.data.arenaWidth*0.5;
    this.mesh.position.z = body.current[1] - settings.data.arenaHeight*0.5;

    this.mesh.visible = body.current[1] !== body.previous[1]
  },

  reset: function(){
    if( this.mesh.parent ){
      this.mesh.parent.remove(this.mesh);
    }
    Bullet.free(this);
  },

  remove: function(){
    if( this.mesh.parent ){
      this.mesh.parent.remove(this.mesh);
    }
    Bullet.free(this);
  }
}

pool(Bullet, 5);