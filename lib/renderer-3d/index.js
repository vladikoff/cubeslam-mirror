/* global THREE:true, TweenMax:true */
var debug = require('debug')('renderer:3d:core')
  , settings = require('../settings')
  , World = require('../world')
  , Environment = require('./environment')
  , Effects = require('./effects')
  , CameraController = require('./camera-controller')
  , Animals = require('./animals')
  , Materials = require('./materials')
  , Geometry = require('./geometry')
  , Player = require('./player')
  , CPU = require('./cpu')
  , actions = require('../actions')
  , Emitter = require('emitter')
  , $ = require('jquery');


module.exports = Renderer;

function Renderer(canvas){
  debug('new')
  this.canvas = canvas;

  this.initiated = false;

  var stuffInitiated = 0;

  Materials.on('isDone', function(){
    stuffInitiated++;
    if( stuffInitiated == 2) {
      this.init();
      this.emit('initDone');
    }
  }.bind(this))

  Geometry.on('isDone', function(){
    stuffInitiated++;
    if( stuffInitiated == 2) {
      this.init();
      this.emit('initDone');
    }
  }.bind(this))

}

Renderer.prototype = Emitter({

  init: function(){

    //time used for camera angle animation
    this.projector = new THREE.Projector();
    this.mouse2d = new THREE.Vector3(0,0,0);
    this.time = 0;
    this.currentState = '';

    this.scene = createScene()
    //this.scene.overrideMaterial = new THREE.MeshLambertMaterial( {color:0x666666} );
    this.container = createContainer(this.scene)
    this.env = new Environment(this)

    this.animals = new Animals(this, this.env);

    this.cameraController = new CameraController();

    this.effects = new Effects(this, this.env)

    this.cpu = null;

    this.userHitEffect = 0;
    this.forcePaddlesToCenter = false;
    //add camera to scene to make childs visible.
    this.cameraController.attachTo(this.scene)
    //this.scene.add(this.cameraController.camera);

    this.renderer = createRenderer(this.canvas)
    this.overlay = createOverlay( this.cameraController.camera);
    this.overlayNoise = createOverlayNoise();
    this.overlayMirror = createOverlayMirror();
    this.overlayCover = createOverlayCover();

    this.mirrorEffectActive = false;
    this.mirrorEffectAnimating = false;

    this.players = {
      me: new Player(this,0),
      opponent: new Player(this,1)
    }

    this.cameraController.setActiveUser(this.players.me);
    this.activePlayer(0,true);


    settings.on('cameraSettingsChanged', function(){
      this.onWindowresize();
      Materials.overlay.uniforms.gridAmount.value = settings.data.cameraGrid
    }.bind(this))

    settings.on('qualityChanged', function(){
     /* if( settings.data.quality == settings.QUALITY_HIGH ) {

      }
      else if( settings.data.quality == settings.QUALITY_LOW ){

      }
*/
      this.selectCameraCanvas();

    }.bind(this))

    settings.on('cameraTypeChanged', function(){

      switch( settings.data.cameraType ) {
        case settings.CAMERA_SCRIPTED:
          this.cameraController.attachTo(this.scene)
          break;
        case settings.CAMERA_FPS:
          this.cameraController.attachTo(this.scene)
          break;
        case settings.CAMERA_CLASSIC:
        this.cameraController.attachTo(this.scene);
          break;
        case settings.CAMERA_RABBIT:
          this.cameraController.attachTo(this.animals.rabbit.mesh);
          break;
        case settings.CAMERA_MOUNTAINVIEW:
          this.cameraController.attachTo(this.scene);
          break;

      }
    }.bind(this))

    window.addEventListener('resize',this.onWindowresize.bind(this),false);
    setTimeout(function(){this.onWindowresize()}.bind(this),100);

    this.initiated = true;

  },

  // called on world.reset()
  reset: function(){
    debug('reset');

    var world = this.world; // lazy fix

    if( !world ) {
      return
    }

    this.triggerMirrorEffect(false);
    this.effects.toggleFog(false);


    this.env.reset()
    this.effects.reset()
  },

  triggerEvent: function( id, paramObj ) {
    debug('triggerEvent',id,paramObj)

    var world = this.world; // lazy fix
    if( !world ) {
      return
    }

    switch(id){

      case 'explodeOpponent':
        this.players.opponent.explode(paramObj.point);
        break

      case 'hitOpponent':
        this.players.opponent.hit(paramObj.point, function(){
          if( this.cpu ){
            this.cpu.triggerEvent('loose');
          }
        }.bind(this));
        break;

       case 'hitMe':
        this.players.opponent.wins();
        this.cameraController.hit()
        if( this.cpu ){
          this.cpu.triggerEvent( 'win');
        }
        this.userHitEffect = 1;
        TweenMax.to(this,0.3,{delay:1,userHitEffect:0, onComplete:function(){
          this.cameraController.camera.remove(this.overlayNoise)
        }.bind(this)})
        break;

      case 'activateExtra':
        this.effects.activateExtra(paramObj.extra,paramObj.puck)
        break;
      case 'resetShield':
        this.animals.triggerEvent( 'bear_win' );
        break;
      case 'resetPaddles':
        this.forcePaddlesToCenter = true;
        break;
      case 'remoteVideoAvailable':
        this.selectCameraCanvas()
        break;
      case 'localVideoAvailable':
        Materials.me.uniforms.noiseAmount.value = 0;
        break;
      case 'friendLeft':
        this.triggerMirrorEffect(false);
        this.blackDisplay();
        break;
      case 'explode':
        this.animals.triggerEvent( 'bear_win' );
        this.players.opponent.explode( Math.random());
        break;
      case 'heal':
        this.players.opponent.heal();
        break;
      case 'gameStart':
        // TODO it would probably be better to keep the score
        // logic out of the renderer. if necessary as a separate
        // 'trigger'.
        if( world.me.score === 0 && world.opponent.score === 0){
          this.restoreDisplay();
        }
        this.players.opponent.reset();
        this.forcePaddlesToCenter = false;
        break;
      case 'roundOver':
        this.animals.triggerEvent( 'bear_win' );
        break;

      case 'levelUp':
        this.players.opponent.heal();
        this.restoreDisplay();
        break;

      case 'restart':
        this.changeView('play');
        this.players.opponent.heal();
        this.restoreDisplay()
        break;
      case 'gameOver':
        this.animals.triggerEvent( 'bear_win' );
        break;
      case 'puckBounce':
        this.effects.puckBounced( paramObj.puck )
        break;
      case 'mirrorEffect':
        this.triggerMirrorEffect( paramObj.active )
        break;
      case 'paddleResize':

        if( paramObj.playerID == 'a'  ){
          this.players.me.resizePaddle(paramObj)
        } else if( paramObj.playerID == 'b'  ){
          this.players.opponent.resizePaddle(paramObj)
        } else {
          console.warn('wrong player id!',paramObj)
        }
        break;
      case 'toggleDeathball':
        this.effects.toggleDeathball(paramObj.active)
        break;
      case 'toggleFog':
        this.effects.toggleFog(paramObj.active, this.cameraController.mirrored)
        break;

      case 'trace-camera':
        var pos = this.cameraController.camera.position;
        var tempObj = this.cameraController.camera.clone();
        tempObj.translateZ(-2000);
        var target = tempObj.position;
        console.log('origin: new THREE.Vector3(%d,%d,%d), target: new THREE.Vector3(%d,%d,%d),  time:3',pos.x,pos.y,pos.z,target.x,target.y,target.z )
        break

      case 'startCountDown':
      case 'setShields':
      case 'paddleHit':
        // nothing...can these be removed?
        break

      default:
        // if this happens, add a case if it should happen otherwise
        // remove it.
        console.warn('unexpected event "%s"',id);
    }
  },

  restoreDisplay: function(){
    Materials.opponent.brokenTextureCtx.fillStyle =  'rgb(0, 0, 0)';
    Materials.opponent.brokenTextureCtx.fillRect(0,0, 256, 256);
    Materials.opponent.uniforms.tBroken.value.needsUpdate = true;
  },

  blackDisplay: function(){
    Materials.opponent.brokenTextureCtx.fillStyle =  'rgb(255, 255, 255)';
    Materials.opponent.brokenTextureCtx.fillRect(0,0, 256, 256);
    Materials.opponent.uniforms.tBroken.value.needsUpdate = true;
  },

  selectCameraCanvas: function() {
   // if( settings.data.quality == settings.QUALITY_HIGH ) {
      Materials.opponent.uniforms.tVideo.value = Materials.remoteVideoTexture;
      Materials.setPixelFormat(settings.data.bgr?Materials.PIXEL_FORMAT_BGR:Materials.PIXEL_FORMAT_RGB);
   /* }
    else if( settings.data.quality == settings.QUALITY_LOW || settings.data.quality === settings.QUALITY_MOBILE){
      Materials.opponent.uniforms.tVideo.value = Materials.remoteVideoDownscaledTexture;
    }*/
  },

  triggerMirrorEffect: function( active ){

    if( this.mirrorEffectActive == active ) {
      return;
    }

    this.mirrorEffectActive = active;

    this.mirrorEffectAnimating = true;

    if( this.mirrorEffectActive ) {

      TweenMax.to( this.overlayMirror.rotation,0.4,{delay:0.1,y:Math.PI,onStart:function(){

      }.bind(this),
      onComplete:function(){

        if( this.overlayMirror.parent ) {
          this.cameraController.camera.remove(this.overlayMirror);
        }
        if( this.overlayCover.parent ) {
          this.cameraController.camera.remove(this.overlayCover);
        }

        this.mirrorEffectAnimating = false;
        $('body').addClass('mirror')
      }.bind(this)})

      TweenMax.to( this.overlayMirror,0.15,{offsetZ: -80, onUpdateScope:this,onUpdate:this.positionMirrorPlane, onComplete:function(){
        TweenMax.to( this.overlayMirror,0.25,{offsetZ: 1, onUpdateScope:this,onUpdate:this.positionMirrorPlane});
      }.bind(this)})

    }
    else {

      this.cameraController.camera.add(this.overlayCover);
      $('body').removeClass('mirror');
      TweenMax.to( this.overlayMirror.rotation,0.4,{delay:0.1,y:0,onStart:function(){

      }.bind(this),
      onComplete:function(){

        this.mirrorEffectAnimating = false;

        if( this.overlayMirror.parent ) {
          this.cameraController.camera.remove(this.overlayMirror);
        }
        if( this.overlayCover.parent ) {
          this.cameraController.camera.remove(this.overlayCover);
        }

      }.bind(this)})

      TweenMax.to( this.overlayMirror,0.15,{offsetZ: -80, onUpdateScope:this,onUpdate:this.positionMirrorPlane, onComplete:function(){
        TweenMax.to( this.overlayMirror,0.25,{offsetZ: 1, onUpdateScope:this,onUpdate:this.positionMirrorPlane});
      }.bind(this)})
    }

  },

  // will rotate camera to behind this player and
  // terrain/forrest to behind the other player and
  // set the correct cube type on the players
  activePlayer: function(id, init, multiplayer){

    debug('active player',id,init,multiplayer);

    this.cameraController.setMirror(id==1);

    if( id === 0 ){

      //single player or player 1
      this.players.me.setDecal(0,multiplayer);
      this.players.opponent.setDecal(1,multiplayer);

      // move the terrain behind b
      this.env.terrain.rotation.y = 0;

      //no mirroring
      this.players.opponent.setCubePosition(true);
      this.players.me.setCubePosition(false);

    } else {

      //player 2 - mirror arena and swap cube-position

      this.players.me.setDecal(1,multiplayer);
      this.players.opponent.setDecal(0,multiplayer);

      // move the terrain behind a
      this.env.terrain.rotation.y = Math.PI;

      this.players.opponent.setCubePosition(false);
      this.players.me.setCubePosition(true);

    }

    if( multiplayer ) {
      this.env.setupAddedRemoved('sync')
      this.selectCameraCanvas()
    }
    else {
      this.env.setupAddedRemoved('game')
      //single player
      if( !this.cpu && !init) {
        this.cpu = new CPU(this.renderer);
        this.cpu.initCharacter();
      }

      if( this.cpu ){
        Materials.opponent.uniforms.tVideo.value = this.cpu.texture;
        Materials.setPixelFormat(Materials.PIXEL_FORMAT_RGB);
      }
    }

  },

  changeView : function( state , callback ) {
    if( this.currentState === state ) {
      if (typeof callback === 'function') {
        callback();
      }
      return;
    }

    this.currentState = state;
    this.cameraController.setState(state);

    switch(state){

      case 'main-menu':
        //hide boxes
        this.players.me.gotoIdleState()
        this.players.opponent.gotoIdleState()
        break;

      case 'webcamActivation':
        this.players.me.show();
        Materials.setPixelFormat(settings.data.bgr?Materials.PIXEL_FORMAT_BGR:Materials.PIXEL_FORMAT_RGB);
        Materials.showLocalVideo = true;

        //try to solve bug with invisible video and switch opponent video texture
        this.selectCameraCanvas();
        break;

      case 'play':
        this.restoreDisplay();
        this.animals.triggerEvent('hunt_birds');
        Materials.showLocalVideo = false;
        this.players.opponent.show();
        this.players.me.hide(true);
        break;

      default:
       // console.warn('unknown renderer event',arguments)
        break;
    }
  },

  render: function(world,alpha){

    this.renderer.clear();

    this.world = world; // TODO this is dumb

    if( world.state === World.PLAYING || world.state === World.PREVIEW ) {
      if( world.players.a.paddle != -1) {
        this.players.me.updatePaddle(world.paddles.get(world.players.a.paddle),alpha);
      }

      if( world.players.b.paddle != -1) {
        this.players.opponent.updatePaddle(world.paddles.get(world.players.b.paddle),alpha);
      }
    }
    else if( world.state !== World.PAUSED || this.forcePaddlesToCenter ){
      this.players.me.paddleToCenterUpdate();
      this.players.opponent.paddleToCenterUpdate();
    }

    this.players.opponent.update();

    Materials.update(world,alpha);
    this.cameraController.update(world,alpha);
    this.env.update(world,alpha);
    this.effects.update(world,alpha);
    this.animals.update(world,alpha);

    // TODO remove cpu rendering if multiplayer after singleplayer
    if( this.cpu && !this.players.opponent.isInTransition ){

      if( world.players.b.paddle != -1 && this.currentState === 'play' ) {
        this.cpu.setPaddleX( world.paddles.get(world.players.b.paddle).current[0]/settings.data.arenaWidth )
      }

      this.time += 0.1;

      this.cpu.update(this.time, world);
      this.cpu.render();
    }

    //update overlay noise
    if( this.userHitEffect > 0.05 ) {
      if( this.overlayNoise.parent ) {
        this.cameraController.camera.remove(this.overlayNoise);
      }
      Materials.overlayNoise.uniforms.noiseAmount.value = this.userHitEffect;
      this.renderer.render( this.scene, this.cameraController.camera,  Materials.overlayNoise.uniforms.tVideo.value ,true);
      this.cameraController.camera.add(this.overlayNoise);
    }

    if( this.mirrorEffectAnimating ) {

      if( this.overlayMirror.parent ) {
        this.cameraController.camera.remove(this.overlayMirror);
      }
      if( this.overlayCover.parent ) {
        this.cameraController.camera.remove(this.overlayCover);
      }

      this.renderer.render( this.scene, this.cameraController.camera,  Materials.overlayMirror.map ,true);
      this.cameraController.camera.add(this.overlayMirror);
      this.cameraController.camera.add(this.overlayCover);
    }

    this.renderer.render(this.scene, this.cameraController.camera)

  },

  onWindowresize: function(){
    var w = window.innerWidth
      , h = window.innerHeight - ($('#footer:visible').height() || 0)
      , cornerDistW = 50-1280/10/w*100
      , cornerDistH = 50-720/10/h*100;

    $('#game').height(h);

    this.renderer.setSize( w, h );

    if( this.overlay ) {

      this.overlay.scale.set( w/1000, h/1000,1);

      this.overlay.position.z = -h*0.1 /(2*Math.tan( this.cameraController.camera.fov*(Math.PI/360)) );

      var verts = this.overlay.geometry.vertices;
      verts[1].x = -cornerDistW;
      verts[5].x = -cornerDistW;
      verts[9].x = -cornerDistW;
      verts[13].x = -cornerDistW;

      verts[2].x = cornerDistW;
      verts[6].x = cornerDistW;
      verts[10].x = cornerDistW;
      verts[14].x = cornerDistW;

      //height
      verts[4].y = cornerDistH;
      verts[5].y = cornerDistH;
      verts[6].y = cornerDistH;
      verts[7].y = cornerDistH;

      verts[8].y = -cornerDistH;
      verts[9].y = -cornerDistH;
      verts[10].y = -cornerDistH;
      verts[11].y = -cornerDistH;

      this.overlay.geometry.verticesNeedUpdate = true;

      this.overlay.visible = settings.data.cameraOverlay;
    }

    this.overlayNoise.scale.set( w/1000, h/1000,1);
    this.overlayNoise.position.z = -h*0.1 /(2*Math.tan( this.cameraController.camera.fov*(Math.PI/360)) );

   this.positionMirrorPlane()

    Materials.updateScreenSize(w,h);

  },

  positionMirrorPlane: function(){
    var w = window.innerWidth
      , h = window.innerHeight - ($('#footer:visible').height() || 0);

    this.overlayMirror.scale.set( w/1000, h/1000,1);
    this.overlayMirror.position.z = -h*0.1 /(2*Math.tan( this.cameraController.camera.fov*(Math.PI/360)) ) + this.overlayMirror.offsetZ;
  }

})


function createRenderer(canvas){
  debug('create renderer')
  var w = window.innerWidth
    , h = window.innerHeight - ($('#footer:visible').height() || 0);


  $('#game').height(h);

  var precision = 'highp';//settings.data.quality == settings.QUALITY_MOBILE ? 'mediump':'highp';
  var devicePixelRatio = settings.data.quality === settings.QUALITY_MOBILE ? 1:undefined;
  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: settings.data.antialias,
    precision: precision,
    devicePixelRatio: devicePixelRatio,
    alpha: false
  });
  renderer.sortObjects = false;
  renderer.setClearColorHex(settings.data.clearColor,1)
  renderer.autoClear = false;
  renderer.maxMorphTargets = 2;

  renderer.setSize( w, h );

  //Materials.setMaxAnisotropy(settings.data.quality === settings.QUALITY_MOBILE?1:renderer.getMaxAnisotropy());
  Materials.setMaxAnisotropy(renderer.getMaxAnisotropy());

  renderer.gammaInput = true;
  renderer.gammaOutput = true;
  renderer.physicallyBasedShading = true;

  return renderer;
}

function createScene(){
  debug('create scene')
  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog( 0xedecd6, 8000, 14000 );

  settings.on('wireframeOverrideChanged', function(){
    scene.overrideMaterial = (settings.data.wireframeOverride)?new THREE.MeshBasicMaterial({wireframe:true,color:0x444444}):null;
  })

  return scene;
}

function createContainer(scene){
  debug('create container')
  var gameContainer = new THREE.Object3D();
  scene.add(gameContainer);
  return gameContainer;
}

function createOverlay( camera ) {

  var planeGeo = new THREE.PlaneGeometry(100,100,3,3);

  var uvs = planeGeo.faceVertexUvs[0];

  /*uvs[0][0].x = marginLeft;
  uvs[3][0].x = marginLeft;
  uvs[6][0].x = marginLeft;*/

  //uvs[1][0].x = marginLeft;

 /*
  face-index:
      -------------
      | 0 | 1 | 2 |
      -------------
      | 3 | 4 | 5 |
      -------------
      | 6 | 7 | 8 |
      -------------

  vertex-index:
      1---2
      |  /|
      | / |
      |/  |
      0---3

  uv-mapping:

    0,1 --- 1,1
       |  /|
       | / |
       |/  |
    0,0 --- 1,0
*/

  var marginTop = 0.1
    , marginLeft = marginTop
    , marginBottom = 0.9
    , marginRight = marginBottom;

  //center face
  var face = uvs[4];
  face[0].x = marginLeft;
  face[0].y = marginRight;
  face[1].x = marginLeft;
  face[1].y = marginTop;
  face[2].x = marginBottom;
  face[2].y = marginTop;
  face[3].x = marginBottom;
  face[3].y = marginRight;

  //top left
  face = uvs[0];
  face[0].x = 0;
  face[0].y = 1;
  face[1].x = 0;
  face[1].y = marginRight;
  face[2].x = marginLeft;
  face[2].y = marginRight;
  face[3].x = marginLeft;
  face[3].y = 1;

  //top right
  face = uvs[2];
  face[0].x = marginBottom;
  face[0].y = 1;
  face[1].x = marginBottom;
  face[1].y = marginRight;
  face[2].x = 1;
  face[2].y = marginRight;
  face[3].x = 1;
  face[3].y = 1;

  //top center
  face = uvs[1];
  face[0].x = marginLeft;
  face[0].y = 1;
  face[1].x = marginLeft;
  face[1].y = marginRight;
  face[2].x = marginBottom;
  face[2].y = marginRight;
  face[3].x = marginBottom;
  face[3].y = 1;

  //bottom left
  face = uvs[6];
  face[0].x = 0;
  face[0].y = marginTop;
  face[1].x = 0;
  face[1].y = 0;
  face[2].x = marginLeft;
  face[2].y = 0;
  face[3].x = marginLeft;
  face[3].y = marginTop;

  //bottom center
  face = uvs[7];
  face[0].x = marginLeft;
  face[0].y = marginTop;
  face[1].x = marginLeft;
  face[1].y = 0;
  face[2].x = marginBottom;
  face[2].y = 0;
  face[3].x = marginBottom;
  face[3].y = marginTop;

  //top bottom
  face = uvs[8];
  face[0].x = marginBottom;
  face[0].y = marginTop;
  face[1].x = marginBottom;
  face[1].y = 0;
  face[2].x = 1;
  face[2].y = 0;
  face[3].x = 1;
  face[3].y = marginTop;

  //center left
  face = uvs[3];
  face[0].x = 0;
  face[0].y = marginRight;
  face[1].x = 0;
  face[1].y = marginTop;
  face[2].x = marginLeft;
  face[2].y = marginTop;
  face[3].x = marginLeft;
  face[3].y = marginRight;

  //center right
  face = uvs[5];
  face[0].x = marginBottom;
  face[0].y = marginRight;
  face[1].x = marginBottom;
  face[1].y = marginTop;
  face[2].x = 1;
  face[2].y = marginTop;
  face[3].x = 1;
  face[3].y = marginRight;

  planeGeo.uvsNeedUpdate = true;


  var plane = new THREE.Mesh(planeGeo, Materials.overlay )
  camera.add(plane);


  plane.visible = settings.data.cameraOverlay;

  return plane;
}

function createOverlayNoise() {

  var planeGeo = new THREE.PlaneGeometry(100,100,1,1);
  var plane = new THREE.Mesh(planeGeo, Materials.overlayNoise )

  return plane;
}

function createOverlayMirror() {

  var planeGeo = new THREE.PlaneGeometry(100,100,1,1);
  var plane = new THREE.Mesh(planeGeo, Materials.overlayMirror )
  plane.offsetZ = 1;
  return plane;
}

function createOverlayCover() {

  var planeGeo = new THREE.PlaneGeometry(10000,10000,1,1);
  var plane = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial( {color:0x000000 } ) )
  plane.position.z = -800;
  return plane;
}
