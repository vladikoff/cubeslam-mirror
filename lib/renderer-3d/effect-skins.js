var debug = require('debug')('renderer:3d:effect-skins')
  , settings = require('../settings')
  , Materials = require('./materials');

module.exports = {
  fire: FireSkin,
  ghost: GhostSkin
};

// Effects
//   - puckTrails[]
//   #update(world)

function FireSkin() {


  var container = new THREE.Object3D();
  var fireGeo = new THREE.BoxGeometry(100,100,100,1,1,1, { px: true, nx: true, py: true, ny: false, pz: true, nz: true });
  fireGeo.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(0,50, 0)));
  var fireMesh = new THREE.Mesh(fireGeo, Materials.fire );
  container.add(fireMesh)

  //fire reflection
  //var fireMeshReflection = new THREE.Mesh(fireGeo, Materials.fireReflection );
  //container.add(fireMeshReflection)

  this.c1 = null;
  this.c2 = new THREE.Color(settings.data.fireColor2).getHSV();
  this.container = container;
  this.isActive = false;
}

FireSkin.prototype.attachToMesh = function( mesh ) {

  this.isActive = true;

  this.parentMesh = mesh

  this.container.position = mesh.position;

  //add as sibling to skinned mesh to solve scaling issues
  this.parentMesh.parent.add(this.container);

  this.c1 = new THREE.Color(settings.data.fireColor).getHSV();

  TweenMax.to(this.c1 ,0.35,{h:this.c2.h,s:this.c2.s,v:this.c2.v, yoyo:true, repeat:-1, onUpdate:function(){
    Materials.fire.color.setHSV(this.c1.h,this.c1.s,this.c1.v);
  }.bind(this),onRepeat:function(){
    //this._duration = Math.random()*0.2+0.35;
  }})

}

FireSkin.prototype.update = function(){
  if( !this.isActive ) return;

  this.parentMesh.geometry.computeBoundingBox();
  var bb = this.parentMesh.geometry.boundingBox.max;

  var parentWidth = this.parentMesh.scale.x*100;
  var parentWidthWithMargins = parentWidth+settings.data.unitSize

  this.container.scale.set(
    parentWidthWithMargins/100,
    (bb.y+settings.data.unitSize*.5)/100,
    (bb.z+settings.data.unitSize)/100
  )
}

FireSkin.prototype.detach = function() {
  this.isActive = false;
  if( this.container.parent) {
    this.container.parent.remove(this.container)
    TweenMax.killTweensOf(this.c1);
  }
}



function GhostSkin() {

  var ghostGeo = new THREE.CubeGeometry(settings.data.unitSize,settings.data.unitSize,settings.data.unitSize);
  ghostGeo.applyMatrix( new THREE.Matrix4().translate( new THREE.Vector3(0,settings.data.unitSize*.5, 0)));
  var ghostMesh = new THREE.Mesh(ghostGeo, Materials.ghost );
  this.isActive = false;
  this.mesh = ghostMesh
  Materials.ghost.opacity = 1;
}

GhostSkin.prototype.attachToMesh = function( mesh ) {

  this.isActive = true;

  this.parentMesh = mesh
  this.parentMesh.visible = false;

  this.mesh.position = mesh.position;

  //add as sibling to skinned mesh to solve scaling issues
  this.parentMesh.parent.add(this.mesh);

}

GhostSkin.prototype.update = function(){
  if( !this.isActive ) return;

  Materials.ghost.opacity *= 0.9;

  if( Materials.ghost.opacity < 0.01 ) Materials.ghost.opacity = 0.01

}

GhostSkin.prototype.detach = function() {
  this.isActive = false;
  
  if( this.mesh.parent) {
    this.mesh.parent.remove(this.mesh);
    this.parentMesh.visible = true;
  }
}
