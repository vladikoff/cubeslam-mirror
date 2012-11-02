var Game = require('./game')
  , debug = require('debug')
  , rtc = require('./rtc')
  , TimeSync = require('./time-sync')
  , Simulator = require('./simulator')
  , Point = require('./sim/point')
  , MotionTracker = require('./motion-tracker')
  , settings = require('./settings')
  , audio = require('./audio'); 

debug.enable('rtc:*')


/**
 * State Hierarchy:
 *
 * states on the same depth replaces each other while nested 
 * states is chained.
 *  
 *  - Lobby
 *  - Play (motion/mouse toggle, local video)
 *    - Network (rtc, remote video)
 *      - Single 
 *        - Simulator
 *      - Multi (time-sync)
 *        - Simulator
 */


var LobbyState = {

  create: function(){
    console.log('LobbyState create')
    document.getElementById('lobby').className = 'sim active';
    document.getElementById('play').addEventListener('click', this.onplay, false);

    // start right way (temporary)
    this.onplay();
  },

  destroy: function(){
    console.log('LobbyState destroy')
    document.getElementById('lobby').className = 'sim';
    document.getElementById('play').removeEventListener('click',this.onplay);
  },

  onplay: function(){
    LobbyState.game.switchState(PlayState);
    return false;
  }

}

var PlayState = {

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
    audio.play("soundtrack");

    // request usermedia (if "ok" it will be inputs.userMedia)
    // and will be used for motion tracking as well as sent
    // along to the other player as a MediaStream.
    this.game.inputs.getUserMedia({video: true, audio: true});

    // TODO maybe refactor MotionTracker from Inputs to here?
    this.game.inputs
      .bind(this.game.inputs.M,'m')
      .bind(this.game.inputs.SPACE,'o');

    this.game.pushState(NetworkState);
  },

  controls: function(inputs){
    // toggle mouse/motion input
    if( inputs.pressed('m') ){
      settings.data.inputType = settings.data.inputType == 'mouse' ? 'motion' : 'mouse';
    }

    // toggle color select overlay
    if( inputs.pressed('o') ){
      inputs.tracker.toggleColorSelect(true);
    } else if( inputs.released('o') ){
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
      if( !NetworkState.host || confirm('A friend has connected, would you like to play against him/her?') ){
        game.switchState(MultiState)
        this.connected = true;
      }
    })
    remote.on('addstream',function(e){
      document.getElementById('vid').className = ''; // show it

      var remoteVideo = document.getElementById('remoteInput');
      remoteVideo.className = ''
      remoteVideo.src = window.webkitURL.createObjectURL(e.stream);

      // store video as input (to be used by the renderer in Simulator#controls)
      game.inputs.remoteVideo = remoteVideo;
    })
    remote.on('disconnect',function(e){
      // Commented out because it might mess now that the disconnect callback 
      // from the google channel comes with a bit of a delay
      // TODO make sure it's the peer that's disconnected, not myself
      // this.connected = false;
      // game.switchState(SingleState)
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
  }

}

var SingleState = {

  create: function(){
    console.log('SingleState create')

    // Start a simulation
    var canv = document.getElementById('canv')
      , form = document.getElementById('form');
    this.sim = new Simulator(canv,form);
    this.game.pushState(this.sim);
  },

  destroy: function(){
    console.log('SingleState destroy')
    if( this.game.isState(this.sim) )
      this.game.popState();
  }

}

var MultiState = {

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
          , done = host ? Date.now() + 5000 : Date.now() + 5000 - this.latency;
        countDown = setInterval(function(){
          var now = Date.now()
          document.getElementById('countdown').innerText = Math.round((done-now)/1000)
          if( now > done ){
            clearInterval(countDown)
            document.getElementById('sta').innerText = 'Go!'


            var canv = document.getElementById('canv')
              , form = document.getElementById('form');
            var sim = new Simulator(canv,form)
            sim.host = host;
            sim.channel = dc;
            MultiState.game.pushState(sim);
            MultiState.sim = sim;
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
    document.getElementById('sta').innerHTML = "Starting in <span id='countdown'>5</span>"
    if( this.game.isState(this.sim) )
      this.game.popState();
  }

}

module.exports = function(){
  new Game()
    .pushState(LobbyState)
    .run()
}