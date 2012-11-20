var Game = require('./game')
  , debug = require('debug')
  , rtc = require('./rtc')
  , TimeSync = require('./time-sync')
  , Simulator = require('./simulator')
  , Renderer = require('./renderer-3d')
  , Point = require('./sim/point')
  , Rect = require('./sim/rect')
  , settings = require('./settings')
  , cameraAttention = require('./camera-attention')
  , audio = require('./audio')
  , world = require('./world')
  , AI = require('./ai');

debug.enable('actions')


/**
 * State Hierarchy:
 *
 * states on the same depth replaces each other while nested
 * states is chained.
 *
 *  - Root (motion/mouse toggle, local video, world, renderer)
 *    - MainMenu
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

    var canv = document.getElementById('canv-3d');
    world.bounds = new Rect(0,settings.data.arenaWidth,settings.data.arenaHeight,0).reverse()
    world.renderer = new Renderer(canv,this.bounds);

    //
    // TODO maybe refactor MotionTracker from Inputs to here?
    this.game.inputs
      .bind(this.game.inputs.M,'m')
      .bind(this.game.inputs.SPACE,'c')
      .bind(this.game.inputs["1"],'cam1')
      .bind(this.game.inputs["2"],'cam2')
      .bind(this.game.inputs["3"],'cam3');

    this.game.pushState(MainMenuState);
  },

  //temp function to trigger scan, alfred to move this source
  scan: function(){
      world.renderer.triggerEvent("scan");
      this.game.inputs.tracker.toggleColorSelect(true);
      this.game.inputs.tracker.toggleColorSelect(false);
      $("#scanButton").fadeOut(200);

      setTimeout(function(){
          world.renderer.changeView("play");
      },1500);
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

    // toggle mouse/motion input
    if( inputs.pressed('m') ){
      settings.data.inputType = settings.data.inputType == 'mouse' ? 'motion' : 'mouse';
    }

    // toggle color select overlay
    if( inputs.pressed('c') ){
      this.scan()
      //inputs.tracker.toggleColorSelect(true);
    } /*else if( inputs.released('c') ){
      inputs.tracker.toggleColorSelect(false);
    }*/


    settings.stats.update();

    // TODO Refactor this here?
    // if( settings.data.inputType == 'motion' )
    //   this.tracker.update();
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
    MainMenuState.game.switchState(PaddleSetupState);
    return false;
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  }

}

var PaddleSetupState = {
  name: 'PaddleSetup',

  create: function() {
    console.log('PaddleSetup create');

    $('.' + this.name).fadeIn();

    world.renderer.changeView("paddleSetup");

    cameraAttention.show();

    $("#scanButton").bind("click",function(){
          world.renderer.triggerEvent("scan");
          this.game.inputs.tracker.toggleColorSelect(true);
          this.game.inputs.tracker.toggleColorSelect(false);
          $(this).fadeOut(200);

          setTimeout(function(){
              this.game.switchState(SingleState);
          }.bind(this),1000)
    }.bind(this));

    // request usermedia (if "ok" it will be inputs.userMedia)
    // and will be used for motion tracking as well as sent
    // along to the other player as a MediaStream.
    this.game.inputs.getUserMedia({video: true, audio: true});

  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    $('.' + this.name).fadeOut();
  }

};

var NetworkState = {
  name: 'Network',

  create: function(){
    console.log('NetworkState create')
    var game = this.game;
    // channelToken, conferenceRoom & clientId are declared in html
    var remote = rtc.connect(channelToken,conferenceRoom,clientId)
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
          // store video as input (to be used by the renderer in Simulator#controls)
          game.inputs.remoteVideo = remoteVideo;
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
    if( inputs.userMedia ){
      // default to use motion if video has been selected
      settings.data.inputType = 'motion';
      // send video to other peer
      this.remote.addStream(inputs.userMedia);

      world.renderer.triggerEvent("webcamEnabled", { tracker:inputs.tracker });

      delete inputs.userMedia; // remove when we have it
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
