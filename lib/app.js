var Game = require('./game')
  , debug = require('debug')
  , rtc = require('./rtc')
  , TimeSync = require('./time-sync')
  , Simulator = require('./simulator')
  , Renderer = require('./renderer-3d')
  , Point = require('./sim/point')
  , Rect = require('./sim/rect')
  , settings = require('./settings')
  , audio = require('./audio')
  , world = require('./world'); 

debug.enable('actions')


/**
 * State Hierarchy:
 *
 * states on the same depth replaces each other while nested 
 * states is chained.
 *  
 *  - MainMenu
 *  - Play (motion/mouse toggle, local video, world, renderer)
 *    - Network (rtc, remote video)
 *      - Single 
 *        - Simulator (actions, physics)
 *      - Multi (time-sync)
 *        - Simulator (actions, physics)
 */


var MainMenuState = {
  name: 'MainMenu',

  create: function(){
    console.log('MainMenuState create')
    document.getElementById('lobby').className = 'sim active';
    document.getElementById('play').addEventListener('click', this.onplay, false);
  },

  destroy: function(){
    console.log('MainMenuState destroy')
    document.getElementById('lobby').className = 'sim';
    document.getElementById('play').removeEventListener('click',this.onplay);
  },

  onplay: function(){
    MainMenuState.game.switchState(PlayState);
    return false;
  }

}

var PlayState = {
  name: 'Play',

  create: function(){
    console.log('PlayState create')
    document.getElementById('game').className = 'sim active';

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
    

    var canv = document.getElementById('canv');
    world.bounds = new Rect(0,settings.data.arenaWidth,settings.data.arenaHeight,0).reverse()
    world.renderer = new Renderer(canv,this.bounds);

    // request usermedia (if "ok" it will be inputs.userMedia)
    // and will be used for motion tracking as well as sent
    // along to the other player as a MediaStream.
    this.game.inputs.getUserMedia({video: true, audio: true});

    // TODO maybe refactor MotionTracker from Inputs to here?
    this.game.inputs
      .bind(this.game.inputs.M,'m')
      .bind(this.game.inputs.SPACE,'c');

    this.game.pushState(NetworkState);
  },

  controls: function(inputs){
    // toggle mouse/motion input
    if( inputs.pressed('m') ){
      settings.data.inputType = settings.data.inputType == 'mouse' ? 'motion' : 'mouse';
    }

    // toggle color select overlay
    if( inputs.pressed('c') ){
      inputs.tracker.toggleColorSelect(true);
    } else if( inputs.released('c') ){
      inputs.tracker.toggleColorSelect(false);
    }


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
      game.switchState(MultiState)
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
    delete this.remote;
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

    // Start a simulation
    this.sim = new Simulator(world);
    this.game.pushState(this.sim);
  },

  destroy: function(){
    console.log('SingleState destroy')
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
              var sim = new Simulator(world);
              sim.host = host;
              sim.channel = dc;
              MultiState.game.pushState(sim);
              MultiState.sim = sim;
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
    .pushState(MainMenuState)
    .run()
}
