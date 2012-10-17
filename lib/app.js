var Game = require('./game')
  , debug = require('debug')
  , rtc = require('./rtc')
  , TimeSync = require('./time-sync')
  , Simulator = require('./simulator');

debug.enable('rtc')

var LobbyState = {

  create: function(){
    document.getElementById('lobby').className += 'active';

    var remote = rtc.connect(channelToken,conferenceRoom)
    remote.on('full',function(e){
      document.getElementById('ful').className = ''; // show it
    })
    remote.on('open',function(e){
      document.getElementById('con').className = ''; // show it
      document.getElementById('syn').className = ''; // show it

      // Use time-sync to sync the time between the peers 
      // before going to the PlayState
      var dc = this.connection.createDataChannel(conferenceRoom);
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
              canv.parentNode.className += ' active'
              document.getElementById('lobby').className = 'sim';
              var PlayState = new Simulator(canv,form)
              PlayState.host = host;
              PlayState.channel = dc;
              diffSim = assertSim = function(){}; // temporary
              LobbyState.game.pushState(PlayState);
            }
          },100);
        })
        .start(this.sentOffer)
    })
  }
}

module.exports = function(){
  new Game()
    .pushState(LobbyState)
    .run()
}