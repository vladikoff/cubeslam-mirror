var Game = require('./game')
  , debug = require('debug')
  , rtc = require('./rtc')
  , TimeSync = require('./time-sync')
  , Simulator = require('./simulator');

debug.enable('rtc game')

// temporary
diffSim = assertSim = function(){}; 

var LobbyState = {

  create: function(){
    document.getElementById('lobby').className = 'sim active';
    document.getElementById('play').addEventListener('click',function(e){
      LobbyState.game.switchState(SingleState);
      return false;
    }, false)

    //Start right away
    LobbyState.game.switchState(SingleState);

  },

  destroy: function(){
    document.getElementById('lobby').className = 'sim';
  }

}

var SingleState = {

  create: function(){
    document.getElementById('game').className = 'sim active';

    console.log('SingleState create')

    var remote = rtc.connect(channelToken,conferenceRoom)
    remote.on('promoted',function(e){
      this.host = true
    })
    remote.on('demoted',function(e){
      this.host = false
    })
    remote.on('full',function(e){
      document.getElementById('ful').className = ''; // show it
    })
    remote.on('open',function(e){
      document.getElementById('con').className = ''; // show it
      document.getElementById('syn').className = ''; // show it

      // Oh hi! A friend has connected, go to the multistate instead
      if( this.host ? confirm('A friend has connected, would you like to play?') : true ){
        MultiState.remote = remote;
        SingleState.game.popState() // leave playstate
        SingleState.game.switchState(MultiState) // enter multistate
      }
    })

    // Start a simulation
    var canv = document.getElementById('canv')
      , form = document.getElementById('form');
    var PlayState = new Simulator(canv,form);
    SingleState.game.pushState(PlayState);
  },

  destroy: function(){
    console.log('SingleState destroy')
    document.getElementById('game').className = 'sim';
    document.getElementById('ful').className = 'hidden';
    document.getElementById('con').className = 'hidden';
    document.getElementById('syn').className = 'hidden';
  }

}

var MultiState = {

  create: function(){
    document.getElementById('game').className = 'sim active';
    console.log('MultiState create')

    var remote = this.remote;

    // Use time-sync to sync the time between the peers 
    // before going to the PlayState
    var dc = remote.connection.createDataChannel(conferenceRoom);
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
            var canv = document.getElementById('canv')
              , form = document.getElementById('form');
            var PlayState = new Simulator(canv,form)
            PlayState.host = host;
            PlayState.channel = dc;
            MultiState.game.pushState(PlayState);

            remote.on('disconnected',function(e){
              MultiState.game.popState() // leave playstate
              MultiState.game.switchState(SingleState) // enter singlestate
            })
          }
        },100);
      })
      .start(remote.host)
    console.log('starting time sync.', remote.host ? 'as host' : 'as guest')
  },

  destroy: function(){
    console.log('MultiState destroy')
    document.getElementById('game').className = 'sim';
    document.getElementById('sync').innerText = '...';
    document.getElementById('sta').className = 'hidden'
  }

}

module.exports = function(){
  new Game()
    .pushState(LobbyState)
    .run()
}