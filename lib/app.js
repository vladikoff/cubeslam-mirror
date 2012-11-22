var Game = require('./game')
  , debug = require('debug')
  , rtc = require('./rtc')
  , TimeSync = require('./time-sync')
  , Simulator = require('./simulator')
  , Renderer = require('./renderer-debug')
  , Point = require('./sim/point')
  , Rect = require('./sim/rect')
  , settings = require('./settings')
  , camera = require('./camera')
  , audio = require('./audio')
  , world = require('./world')
  , AI = require('./ai');

debug.enable('game actions')


/**
 * State Hierarchy:
 *
 * states on the same depth replaces each other while nested
 * states is chained.
 *
 *  - Root (motion/mouse toggle, local video, world, renderer, audio)
 *    - MainMenu
 *    - WebcamActivation
 *    - Network (rtc, remote video)
 *      - Single
 *        - Simulator (actions, physics)
 *      - Multi (time-sync)
 *        - Simulator (actions, physics)
 */


var RootState = {
  name: 'Root',

  create: function() {
    console.log('RootState create');

    var soundList = [
        { id:"hit", url:"audio/hit2.wav", pitch:"random",loop:false,volume:1},
        { id:"hit2", url:"audio/hit3.wav", pitch:"random",loop:false,volume:1},
        { id:"miss", url:"audio/miss.wav", pitch:"",loop:false,volume:1},
        { id:"soundtrack", url:"audio/soundtrack.mp3",pitch:"",loop:true,volume:0.5}
    ]
    audio.init(soundList);

    if( settings.data.playSoundtrack ) {
      audio.play("soundtrack");
    }

    var canv = document.getElementById('canv-3d');
    world.bounds = new Rect(0,settings.data.arenaWidth,settings.data.arenaHeight,0).reverse()
    world.renderer = new Renderer(canv,this.bounds);

    this.game.inputs
      .bind(this.game.inputs.M,'m')
      .bind(this.game.inputs.SPACE,'c')
      .bind(this.game.inputs["1"],'cam1')
      .bind(this.game.inputs["2"],'cam2')
      .bind(this.game.inputs["3"],'cam3')
      .bind(this.game.inputs.L,'l')
      .bind(this.game.inputs["4"],'skip');

    this.game.pushState(MainMenuState);
  },


  controls: function(inputs){

    //temporary camera view selection
    if( inputs.pressed('cam1')) {
      world.renderer.changeView("lobby");
    }
    else if( inputs.pressed('cam2')) {
      world.renderer.changeView("paddleSetup");
    }
    else if( inputs.pressed('cam3')) {
      world.renderer.changeView("play");
    }

    if( inputs.pressed('skip') )
      this.game.switchState(NetworkState);

    // toggle mouse/motion input
    if( inputs.pressed('m') ){
      settings.data.inputType = settings.data.inputType == 'mouse' ? 'motion' : 'mouse';
    }

    // log the position of the pucks
    if( inputs.pressed('l') )
      console.log(world.pucks)

    settings.stats.update();
  },

  destroy: function(){
    console.log('PlayState destroy')
    document.getElementById('game').className = 'sim';
    this.game.popState();
  }

}

var MainMenuState = {
  name: 'MainMenu',

  create: function(){
    console.log('MainMenuState create')
    document.getElementById('play').addEventListener('click', this.onplay, false);

    $('.' + this.name).fadeIn();

    // invert the renderer if player is guest
    world.renderer.activePlayer(world.host ? 0 : 1)
    world.renderer.changeView("lobby");
  },

  destroy: function(){
    console.log('MainMenuState destroy')
    $('.' + this.name).fadeOut();
    document.getElementById('play').removeEventListener('click',this.onplay);
  },

  onplay: function(){
    MainMenuState.game.switchState(WebcamActivationState);
    return false;
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  }

}

var WebcamActivationState = {
  name: 'WebcamActivation',
  create: function() {
    $('.' + this.name).fadeIn();
    camera.start();
    world.renderer.changeView("play");
    camera.on('userMedia', function() {
      this.game.switchState(PaddleSetupState);
    }.bind(this));
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    $('.' + this.name).fadeOut();
  }

}

var PaddleSetupState = {
  name: 'PaddleSetup',

  create: function() {
    world.renderer.triggerEvent('webcamEnabled');
    console.log('PaddleSetup create');

    $('.' + this.name).fadeIn();

    world.renderer.changeView("paddleSetup");

    $("#scanButton").one("click",function(){
      world.renderer.triggerEvent("scan");
      this.game.inputs.tracker.toggleColorSelect(true);
      this.game.inputs.tracker.toggleColorSelect(false);
      $(this).fadeOut(200);

      setTimeout(function(){
        this.game.switchState(NetworkState);
      }.bind(this),1000)
    }.bind(this));

  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    $('.' + this.name).fadeOut();
    $("#scanButton").off("click")
  }

};

var NetworkState = {
  name: 'Network',

  create: function(){
    console.log('NetworkState create')
    var game = this.game;
    // channelToken, conferenceRoom & clientId are declared in html
    var remote = rtc.connect(channelToken,conferenceRoom,clientId)

    camera.on('userMedia', function(stream) {
      settings.data.inputType = 'motion';
      this.remote.addStream(stream);
      world.renderer.triggerEvent("webcamEnabled");
    }.bind(this));

    remote.on('promoted',function(id){
      NetworkState.host = true
      document.getElementById('hos').className = ''; // show it
    })
    remote.on('demoted',function(e){
      // TODO Not implemented yet...
      NetworkState.host = false
    })
    remote.on('full',function(e){
      document.getElementById('ful').className = ''; // show it
    })
    remote.on('open',function(e){
      document.getElementById('con').className = ''; // show it
      document.getElementById('syn').className = ''; // show it

      if( this.connected )
        return console.log('already connected');

      // Oh hi! A friend has connected, go to the multistate instead
      this.connected = true;
      game.popState().switchState(MultiState)
    })
    remote.on('addstream',function(e){
      document.getElementById('vid').className = ''; // show it

      var remoteVideo = document.getElementById('remoteInput');
      remoteVideo.src = window.webkitURL.createObjectURL(e.stream);

      // wait until the video actually has started before adding it to the
      // simulator.
      // TODO this is a hack, there must be a better way...
      function wait(){
        if (e.stream.videoTracks.length === 0 || remoteVideo.currentTime > 0) {
          world.renderer.swapToVideoTexture();
        } else {
          setTimeout(wait, 100);
        }
      }
      wait()
    })
    remote.on('removestream',function(e){
      document.getElementById('vid').className = 'hidden';
      document.getElementById('remoteInput').src = null;
    })
    remote.on('disconnect',function(e){
      document.getElementById('con').className = 'hidden';
      document.getElementById('syn').className = 'hidden';
      document.getElementById('vid').className = 'hidden';
      document.getElementById('remoteInput').src = null;
      this.connected = false;
      game.popState().switchState(SingleState)
    })
    this.remote = remote;

    // defaults to start SingleState
    game.pushState(SingleState)
  },

  controls: function(inputs){
    // extract the color currently selected
    if( inputs.motion.color ){
      world.renderer.triggerEvent('paddleColor',inputs.motion.color);
    }
  },

  destroy: function(){
    console.log('NetworkState destroy')
    this.remote.off('promoted')
    this.remote.off('demoted')
    this.remote.off('full')
    this.remote.off('open')
    this.remote.off('addstream')
    this.remote.off('disconnect')
    this.remote = null;
    document.getElementById('vid').className = 'hidden';
    document.getElementById('ful').className = 'hidden';
    document.getElementById('con').className = 'hidden';
    document.getElementById('hos').className = 'hidden';
    document.getElementById('syn').className = 'hidden';
    document.getElementById('remoteInput').src = null;
  }

}

var SingleState = {
  name: 'Single',

  create: function(){
    console.log('SingleState create')

    world.renderer.activePlayer(world.host ? 0 : 1)
    world.renderer.changeView("play");

    // Start a simulation
    this.sim = new Simulator(world);
    this.game.pushState(this.sim);

    this.ai = new AI();

  },

  controls: function(inputs){
    if( this.ai.update(world) ){
      inputs.ai = this.ai.position;
    }
  },

  destroy: function(){
    console.log('SingleState destroy')
    this.ai = null
    if( this.game.isState(this.sim) )
      this.game.popState();
  }

}

var MultiState = {
  name: 'Multi',

  create: function(){
    console.log('MultiState create')

    // Use time-sync to sync the time between the peers
    // before going to the PlayState
    var dc = NetworkState.remote.connection.createDataChannel(conferenceRoom);
    TimeSync(dc)
      .on('timeout',function(){
        console.error('time sync timed out')
        document.getElementById('sync').innerText = 'Timed out. Reload to try again.';
      })
      .on('done',function(host){
        document.getElementById('sync').innerText = 'Done. Latency: '+Math.round(this.latency);
        document.getElementById('sta').className = ''; // show it

        var sim = new Simulator(world);
        sim.paused = true
        sim.channel = dc;
        console.log('instantiated Simulator in paused mode')

        console.log('time sync (was host? %s), latency:',host,this.latency)
        var countDown
          , done = host
            ? Date.now() + settings.data.countdown
            : Date.now() + settings.data.countdown - this.latency;
        countDown = setInterval(function(){
          var now = Date.now()
          document.getElementById('countdown').innerText = Math.round((done-now)/1000)
          if( now > done ){
            clearInterval(countDown)

            // make sure state has not already been switched
            // (like in the case of a disconnect)
            if( MultiState.game ){
              document.getElementById('sta').className = 'hidden'
              document.getElementById('go').className = ''
              MultiState.game.pushState(sim);
              MultiState.sim = sim;
              sim.paused = false
              console.log('unpaused Simulator')
            }
          }
        },100);
      })
      .start(NetworkState.host)
    console.log('starting time sync.', NetworkState.host ? 'as host' : 'as guest')
  },

  destroy: function(){
    console.log('MultiState destroy')
    document.getElementById('sync').innerText = '...';
    document.getElementById('sta').className = 'hidden';
    document.getElementById('go').className = 'hidden';
    if( this.game.isState(this.sim) )
      this.game.popState();
  }

}

module.exports = function(){
  new Game()
    .pushState(RootState)
    .run()
}
