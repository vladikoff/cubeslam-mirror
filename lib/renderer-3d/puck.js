var debug = require('debug')('renderer:3d:puck')
    , Materials = require('./materials')
    , pool = require('../support/pool')
    , settings = require('../settings')
    , raf = require('request-animation-frame')


module.exports = Puck;

var hw = settings.data.arenaWidth*0.5
  , hh = settings.data.arenaHeight*0.5;

var geom = new THREE.CubeGeometry(settings.data.unitSize,settings.data.unitSize*2,settings.data.unitSize )

function Puck(){
  this.mesh = new THREE.Mesh( geom, Materials.puck.clone() );
}

Puck.prototype = {
  add: function(parent,body){
    debug('add');

    this.mesh.position.set(body.current[0]-hw,0,body.current[1]-hh);
    this.mesh.scale.y = 0.01;
    this.scaleTo(1);

    parent.add(this.mesh);

    return this;
  },

  update: function(world,body,alpha){

    if(!this.mesh) {
      console.warn('Puck not created yet');
      return;
    }

    this.mesh.position.x = ((body.current[0]+body.offset[0])*alpha + (body.previous[0]+body.offset[0])*(1-alpha)) - hw;
    this.mesh.position.z = ((body.current[1]+body.offset[1])*alpha + (body.previous[1]+body.offset[1])*(1-alpha)) - hh;

  },

  scaleTo: function( scaleTo ){
    debug('scale to', scaleTo);
    this.targetScale = scaleTo;
    this.renderScale();
  },

  renderScale: function(){

    if( this.targetScale == 0.01 && Math.abs(this.targetScale - this.mesh.scale.y)<0.01) {
      if( this.mesh.parent) {
        this.mesh.parent.remove(this.mesh);
      }
    }
    else if( this.targetScale == 1 && Math.abs(this.targetScale - this.mesh.scale.y)<0.01) {
      this.mesh.scale.y = 1;
    }
    else {
      this.mesh.scale.y += (this.targetScale-this.mesh.scale.y)*0.5;
      raf( this.renderScale.bind(this) )
    }
  },

  reset: function(){
    debug('reset');
    this.scaleTo(0.01);
    Puck.free(this);
  },

  remove: function(){
    debug('remove');
    this.scaleTo(0.01);
    this.mesh.parent.remove(this.mesh);
    Puck.free(this);
  }
}

pool(Puck, 1)