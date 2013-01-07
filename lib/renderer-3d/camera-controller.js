var settings = require('../settings')
  , debug = require('debug')('renderer:3d:camera');

module.exports = CameraController;

// Camera
//   - puckTrails[]
//   #update(world)

function CameraController(){
  debug('new')
  
  var camera = new THREE.PerspectiveCamera( 50, 1, 10, 20000 );
  camera.target = new THREE.Vector3(0,0,0);
  
  this.camera = camera;

}

CameraController.prototype = {

  reset: function(){
    debug('reset')
   
  },

  update: function(world,alpha){  

  }
}

