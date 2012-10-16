var Game = require('./game')
  , debug = require('debug')
  , rtc = require('./rtc')
  , TimeSync = require('./time-sync')
  , Simulator = require('./simulator');

debug.enable('rtc')

var LobbyState = {

  create: function(){
    var remote = rtc.connect(channelToken,conferenceRoom)
    remote.on('open',function(e){
      // Use time-sync to sync the time between the peers 
      // before going to the PlayState
      var dc = this.connection.createDataChannel(conferenceRoom);
      TimeSync(dc)
        .on('timeout',function(){
          console.error('time sync timed out')
        })
        .on('done',function(host){
          console.log('time sync (was host? %s), latency:',host,this.latency)
          var countDown
            , done = host ? Date.now() + 5000 : Date.now() + 5000 - this.latency;
          countDown = setInterval(function(){
            var now = Date.now()
            console.log(Math.round((done-now)/1000))
            if( now > done ){
              clearInterval(countDown)
              var canv = document.getElementById( host ? 'host' : 'guest' )
                , form = document.getElementById( host ? 'host-form' : 'guest-form' );
              canv.parentNode.className += ' active'
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