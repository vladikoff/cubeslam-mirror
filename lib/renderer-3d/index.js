var debug = require('debug')('renderer:3d:core')
  , settings = require('../settings')
  , Environment = require('./environment')
  , Effects = require('./effects')
  , CameraController = require('./camera-controller')
  , Animals = require('./animals')
  , Materials = require('./materials')
  , Themes = require('./themes')
  , Player = require('./player')
  , $ = require('jquery')
  , World = require('../world')
  , CPU = require('./cpu');


module.exports = Renderer;

function Renderer(canvas){
  debug('new')

  //time used for camera angle animation
  this.projector = new THREE.Projector();
  this.mouse2d = new THREE.Vector3(0,0,0);
  this.time = 0;
  this.currentState = "";
  this.canvas = canvas;
  this.scene = createScene()

  this.container = createContainer(this.scene)
  this.env = new Environment(this)

  this.animals = new Animals(this, this.env)

  this.cameraController = new CameraController();

  this.effects = new Effects(this, this.env)

  this.cpu = null;

  this.userHitEffect = 0;
  this.forcePaddlesToCenter = false;
  //add camera to scene to make childs visible.
  this.scene.add(this.cameraController.camera);

  this.renderer = createRenderer(canvas)
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

  window.addEventListener('resize',this.onWindowresize.bind(this),false);
  this.onWindowresize();


}

Renderer.prototype = {

  // called on world.reset()
  reset: function(){
    debug('reset');

    var world = this.world; // lazy fix

    if( !world ) return

   // this.players.me.reset()

    this.triggerMirrorEffect(false);
    this.effects.toggleFog(false);

    this.env.reset()
    this.effects.reset()
  },


  triggerEvent: function( id, paramObj ) {
    debug('triggerEvent',id,paramObj)

    var world = this.world; // lazy fix

    if( !world ) return

    switch(id){

      case 'hitOpponent':
        // got "a" or "b" in paramObj. Used to get correct shield-material
        //this.players[paramObj.player].shield.material.uniforms.uBrightness.value = 2;
        if(world.me.score === 3) {
          this.players.opponent.explode(paramObj.point);
          //this.animals.triggerEvent( "bear_win" );
        }
        else {
            this.players.opponent.hit(paramObj.point, function(){
            if( this.cpu )
              this.cpu.triggerEvent("loose");
          }.bind(this));
        }

        break;
       case 'hitMe':

        // got "a" or "b" in paramObj. Used to get correct shield-material
        //this.players[paramObj.player].shield.material.uniforms.uBrightness.value = 2;

        this.players.opponent.wins();
        this.cameraController.hit()

        if( this.cpu )
          this.cpu.triggerEvent( "win");

        this.userHitEffect = 1;
        TweenMax.to(this,0.3,{delay:1,userHitEffect:0, onComplete:function(){
          this.cameraController.camera.remove(this.overlayNoise)
        }.bind(this)})

        break;
      case 'activateExtra':
        this.effects.activateExtra(paramObj.extra,paramObj.puck)
        break;

      case 'setShields':
        break;
      case 'resetShield':
        this.animals.triggerEvent( "bear_win" );
        break;
      case 'resetPaddles':
        this.forcePaddlesToCenter = true;
        break;
      case 'remoteVideoAvailable':
        Materials.opponent.uniforms.tVideo.value = Materials.remoteVideoTexture;
        // nothing?
        break;
      case 'localVideoAvailable':
        Materials.me.uniforms.noiseAmount.value = 0;
        break;
      case 'friendLeft':
        //this.inactive.reflection.material = Materials.cpu;
        this.triggerMirrorEffect(false);
        this.restoreDisplay();
        break;
      case 'explode':
        this.animals.triggerEvent( "bear_win" );
        this.players.opponent.explode( Math.random());
        break;
      case 'heal':
        this.players.opponent.heal();
        break;
      case 'changeLevel':
        Themes.goto( paramObj.level);
        break;
      case 'gameStart':
        //Themes.goto(world.level);
        this.players.opponent.reset();
        this.forcePaddlesToCenter = false;
        break;
      case 'roundOver':
        this.animals.triggerEvent( "bear_win" );
        break;

      case 'levelUp':
        //Themes.next();
        this.players.opponent.heal();
        this.restoreDisplay();
        break;
      case 'restart':
        this.changeView("play");
        this.players.opponent.heal();
        this.restoreDisplay()
        break;
      case 'gameOver':
        this.animals.triggerEvent( "bear_win" );
        //this.players.opponent.explode();
        break;
      case 'puckBounce':
        this.effects.puckBounced( paramObj.puck )
        break;
      case 'mirrorEffect':
        this.triggerMirrorEffect( paramObj.active )
        break;
      case 'paddleResize':
        if( paramObj.player == world.players.a  )
          this.players.me.resizePaddle()
        else 
          this.players.opponent.resizePaddle()
        break;
      case 'toggleDeathball':
        this.effects.toggleDeathball(paramObj.active)
        break;
      case 'toggleFog':
        this.effects.toggleFog(paramObj.active, id==1 )
        break;
      case 'paddleHit':
        // nothin...
        break
      case 'trace-camera':

        var pos = this.cameraController.camera.position;
        var tempObj = this.cameraController.camera.clone();
        tempObj.translateZ(-2000);
        var target = tempObj.position;

        console.log("origin: new THREE.Vector3(%d,%d,%d), target: new THREE.Vector3(%d,%d,%d),  time:3",pos.x,pos.y,pos.z,target.x,target.y,target.z )
        break

      default:
        // if this happens, add a case if it should happen otherwise
        // remove it.
        console.warn('unexpected event "%s"',id);
    }
  },

  restoreDisplay: function(){
    Materials.opponent.brokenTextureCtx.fillStyle =  "rgba(0, 0, 0, 1)";
    Materials.opponent.brokenTextureCtx.fillRect(0,0, 512, 512);
    Materials.opponent.uniforms.tBroken.value.needsUpdate = true;
  },

  triggerMirrorEffect: function( active ){

    if( this.mirrorEffectActive == active ) return;

    this.mirrorEffectActive = active;

    this.mirrorEffectAnimating = true;

    if( this.mirrorEffectActive ) {

      TweenMax.to( this.overlayMirror.rotation,0.4,{delay:0.1,y:Math.PI,onStart:function(){

      }.bind(this),
      onComplete:function(){

        if( this.overlayMirror.parent ) this.cameraController.camera.remove(this.overlayMirror);
        if( this.overlayCover.parent ) this.cameraController.camera.remove(this.overlayCover);

        this.mirrorEffectAnimating = false;
        $('body').addClass('mirror')
      }.bind(this)})

      TweenMax.to( this.overlayMirror,0.15,{offsetZ: -80, onUpdateScope:this,onUpdate:this.positionMirrorPlane, onComplete:function(){
        TweenMax.to( this.overlayMirror,0.25,{offsetZ: 1, onUpdateScope:this,onUpdate:this.positionMirrorPlane});
      }.bind(this)})

    }
    else {

      this.cameraController.camera.add(this.overlayCover);
      $('body').removeClass('mirror')
      TweenMax.to( this.overlayMirror.rotation,0.4,{delay:0.1,y:0,onStart:function(){

      }.bind(this),
      onComplete:function(){

        this.mirrorEffectAnimating = false;

        if( this.overlayMirror.parent ) this.cameraController.camera.remove(this.overlayMirror);
        if( this.overlayCover.parent ) this.cameraController.camera.remove(this.overlayCover);

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
    debug('active player',id,init,multiplayer)

    this.cameraController.setMirror(id==1);

    if( id == 0 ){

      //single player or player 1

      this.players.me.setDecal(0);
      this.players.opponent.setDecal(1);

      // move the terrain behind b
      this.env.terrain.rotation.y = 0;

      //no mirroring
      this.players.opponent.setCubePosition(true);
      this.players.me.setCubePosition(false);

    } else {

      //player 2 - mirror arena and swap cube-position

      this.players.me.setDecal(1);
      this.players.opponent.setDecal(0);

      // move the terrain behind a
      this.env.terrain.rotation.y = Math.PI;

      this.players.opponent.setCubePosition(false);
      this.players.me.setCubePosition(true);

    }

    if( multiplayer ) {
      this.env.setupAddedRemoved('sync')
      Materials.opponent.uniforms.tVideo.value = Materials.remoteVideoTexture;
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
      }
    }

  },

  changeView : function( state , callback ) {
    var world = this.world; // lazy fix

    //if( !world ) return

    if( this.currentState == state ) {
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
        //this.players.me.show(true)
        this.players.opponent.gotoIdleState()
        //this.players.opponent.show(true)
        break;
      case 'webcamActivation':
        this.players.me.show()
        Materials.showLocalVideo = true;

        break;
      case 'play':
        this.animals.triggerEvent("hunt_birds");
        Materials.showLocalVideo = false;
        this.players.opponent.show();
        this.players.me.hide(true);

        break;
      default:
       // console.warn('unknown renderer event',arguments)
        break;
    }
  },

  getWorldCoordinate: function(x,y) {
    var vector = new THREE.Vector3(x,y,0);
    this.projector.unprojectVector( vector, this.cameraController.camera );
    var dir = vector.subSelf( this.cameraController.camera.position ).normalize();
    // var ray = new THREE.Ray( this.cameraController.camera.position, dir );
    var distance = (settings.data.arenaHeight*.5 - (this.cameraController.camera.position.z-this.cameraController.cameraOffset.z)) / dir.z;
    var pos = this.cameraController.camera.position.clone().addSelf( dir.multiplyScalar( distance ) );
    return pos.x;
  },

  render: function(world,alpha){

    this.renderer.clear();

    this.world = world; // TODO this is dumb

    //if (this.players && world.players ) {

    if( world.state === World.PLAYING || world.state === World.PREVIEW ) {
      this.players.me.updatePaddle(world.paddles.get(world.players.a.paddle),alpha)
      this.players.opponent.updatePaddle(world.paddles.get(world.players.b.paddle),alpha)
    }
    else if( world.state !== World.PAUSED || this.forcePaddlesToCenter ){
      this.players.me.paddleToCenterUpdate()
      this.players.opponent.paddleToCenterUpdate()
    }

    this.players.opponent.update();

    Materials.update(world,alpha)
    this.cameraController.update(world,alpha);
    this.env.update(world,alpha)
    this.effects.update(world,alpha)
    this.animals.update(world,alpha)

    // TODO remove cpu rendering if multiplayer after singleplayer
    if( this.cpu && !this.players.opponent.isInTransition ){

      if( world.players.b.paddle != -1 && this.currentState == "play" ) {
        this.cpu.setPaddleX( world.paddles.get(world.players.b.paddle).current[0]/settings.data.arenaWidth )
      }

      this.time += 0.1;

      this.cpu.update(this.time, world);
      this.cpu.render();
    }

    //update overlay noise
    if( this.userHitEffect > 0.05 ) {
      if( this.overlayNoise.parent ) this.cameraController.camera.remove(this.overlayNoise);
      Materials.overlayNoise.uniforms.noiseAmount.value = this.userHitEffect;
      this.renderer.render( this.scene, this.cameraController.camera,  Materials.overlayNoise.uniforms.tVideo.value ,true);
      this.cameraController.camera.add(this.overlayNoise);
    }

    if( this.mirrorEffectAnimating ) {
      if( this.overlayMirror.parent ) this.cameraController.camera.remove(this.overlayMirror);
      if( this.overlayCover.parent ) this.cameraController.camera.remove(this.overlayCover);
        //this.overlay.visible=false;
        this.renderer.render( this.scene, this.cameraController.camera,  Materials.overlayMirror.map ,true);
        this.cameraController.camera.add(this.overlayMirror);
        this.cameraController.camera.add(this.overlayCover);
        //this.overlay.visible=true;
    }

    this.renderer.render(this.scene, this.cameraController.camera)

  },

  onWindowresize: function(){

    w = window.innerWidth;
    h = window.innerHeight - $('#footer').height();

    $('#game').height(h);

    this.renderer.setSize( w, h );

    this.overlay.scale.set( w/1000, h/1000,1);

    this.overlay.position.z = -h*0.1 /(2*Math.tan( this.cameraController.camera.fov*(Math.PI/360)) );


    cornerDist = 50-1280/10/w*100;

    var verts = this.overlay.geometry.vertices;
    verts[1].x = -cornerDist;
    verts[5].x = -cornerDist;
    verts[9].x = -cornerDist;
    verts[13].x = -cornerDist;

    verts[2].x = cornerDist;
    verts[6].x = cornerDist;
    verts[10].x = cornerDist;
    verts[14].x = cornerDist;

    cornerDist = 50-720/10/h*100;

    verts[4].y = cornerDist;
    verts[5].y = cornerDist;
    verts[6].y = cornerDist;
    verts[7].y = cornerDist;

    verts[8].y = -cornerDist;
    verts[9].y = -cornerDist;
    verts[10].y = -cornerDist;
    verts[11].y = -cornerDist;

    this.overlay.geometry.verticesNeedUpdate = true;


    this.overlayNoise.scale.set( w/1000, h/1000,1);
    this.overlayNoise.position.z = -h*0.1 /(2*Math.tan( this.cameraController.camera.fov*(Math.PI/360)) );

   this.positionMirrorPlane()

    Materials.updateScreenSize(w,h);

  },

  positionMirrorPlane: function(){
    w = window.innerWidth;
    h = window.innerHeight - $('#footer').height();

    this.overlayMirror.scale.set( w/1000, h/1000,1);
    this.overlayMirror.position.z = -h*0.1 /(2*Math.tan( this.cameraController.camera.fov*(Math.PI/360)) ) + this.overlayMirror.offsetZ;
  }

}


function createRenderer(canvas){
  debug('create renderer')
  var w = window.innerWidth
    , h = window.innerHeight - $('#footer').height();
  $('#game').height(h);
  var renderer = new THREE.WebGLRenderer({canvas: canvas, antialias:true});
  renderer.sortObjects = false;
  renderer.setClearColorHex(settings.data.clearColor,1)
  renderer.autoClear = false;
  renderer.maxMorphTargets = 2;

  renderer.setSize( w, h );

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

  var marginLeft = marginTop = 0.1,
      marginRight = marginBottom = 0.9;

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
  var face = uvs[3];
  face[0].x = 0;
  face[0].y = marginRight;
  face[1].x = 0;
  face[1].y = marginTop;
  face[2].x = marginLeft;
  face[2].y = marginTop;
  face[3].x = marginLeft;
  face[3].y = marginRight;

  //center right
  var face = uvs[5];
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
