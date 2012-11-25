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
 *    - Network (rtc, remote video)
 *      - Loading
 *      - MainMenu
 *      - WebcamActivation
 *        - Single
 *          - Simulator (actions, physics)
 *        - Multi (time-sync)
 *          - Simulator (actions, physics)
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
      .bind(this.game.inputs["4"],'skip')
      .bind(this.game.inputs.Q,'gameover')
      .bind(this.game.inputs.Z,'2d')
      .bind(this.game.inputs.X,'3d')
      .bind(this.game.inputs.C,'2d+3d');

    this.game.pushState(NetworkState);

   
    $('.shareUrl').each(function() {
      if ($(this).is('input')) {
        $(this).val(document.location.href);
      } else {
        $(this).html(document.location.href);
      }
    });

    $('.state').each(function() { $(this).addClass('inactive'); });

  },


  controls: function(inputs){

    //temporary camera view selection
    if( inputs.pressed('cam1')) {
    
    }
    else if( inputs.pressed('cam2')) {
      world.renderer.changeView("paddleSetup");
    }
    else if( inputs.pressed('cam3')) {
      world.renderer.changeView("play");
    }

    if( inputs.pressed('2d') )
      world.renderer.triggerEvent('2d')
    else if( inputs.pressed('3d') )
      world.renderer.triggerEvent('3d')
    else if( inputs.pressed('2d+3d') )
      world.renderer.triggerEvent('2d+3d')

    if( inputs.pressed('skip') )
      this.game.switchState(GameStartState);
    if( inputs.pressed('gameover') )
      this.game.switchState(GameOverState);

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

var LoadingState = {
  name: 'Loading',
  create: function() {
  },
  destroy: function() {
    LoadingState = false; // We will never have to return to this state.
    $('.state.Loading').remove();
  }
}

var MainMenuState = {
  name: 'MainMenu',
  nextState: null,

  create: function(){
    console.log('MainMenuState create')

    $('.MainMenu .play').click(function() {
      if (this.nextState == null) this.nextState = WebcamActivationState;
      this.game.switchState(this.nextState);
    }.bind(this));

    // invert the renderer if player is guest
    world.renderer.activePlayer(world.host ? 0 : 1)
    world.renderer.changeView("lobby");
  },

  destroy: function(){
    console.log('MainMenuState destroy')
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  }

}

var WebcamActivationState = {
  name: 'WebcamActivation',
  create: function() {
    camera.start();
    world.renderer.changeView("paddleSetup");
    camera.on('userMedia', function() {
      this.game.switchState(PaddleSetupState);
    }.bind(this));
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
  }

}

var PaddleSetupState = {
  name: 'PaddleSetup',

  nextState: null,

  scanned: false, // This boolean tell wheather the user ever configured his/her paddle.

  create: function() {

    world.renderer.triggerEvent('webcamEnabled');
    console.log('PaddleSetup create');


    world.renderer.changeView("paddleSetup");

    $("#scanButton").one("click",function(){
      this.scanned = true;
      world.renderer.triggerEvent("scan");
      this.game.inputs.tracker.updateTrackingColor()
      $(this).fadeOut(200);

      setTimeout(function(){
        if (this.nextState == null) this.nextState = GameStartState;
        this.game.switchState(this.nextState);
      }.bind(this),1000)
    }.bind(this));

  },

  controls: function(inputs){
    // using the same method to trigger color
    // so we don't have to update strange coordinates
    inputs.tracker.updateTrackingColor()
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    $("#scanButton").off("click")
  }

};

var NetworkState = {
  name: 'Network',
  remote: null,
  host: false, // True or false.
  inviteStatus: null,
  opponentGameState: null, // State of the opponent.
  channel: null, // A DataChannel for invite status messages.

  create: function(){
    console.log('NetworkState create')

    var game = this.game;

    // The clientId is passed as cookie, hence this function:
    function getCookie(cookieName) {
      if (!document.cookie) return null;
      var cookieVal = null;
      var a = document.cookie.split((escape(cookieName) + '='));
      if (a.length < 2) return null;
      return unescape(a[1].split(';'));
    }

    // channelToken & conferenceRoom are declared in html. clientId is a cookie.
    this.remote = rtc.connect(channelToken, conferenceRoom, getCookie("clientId"))

    // Am I the host or not.
    this.remote.on('promoted',function(id){
      NetworkState.host = true
      document.getElementById('hos').className = ''; // show it
      console.log('I am host');
      $('.host').show();
      $('.slave').hide();
      LoadingState && this.game.switchState(MainMenuState);
    }.bind(this));
    this.remote.on('demoted',function(e){
      NetworkState.host = false
      $('.host').hide();
      $('.slave').show();
      console.log('I am not host');
      LoadingState && this.game.switchState(MainMenuState);
    }.bind(this));

    // Wait for camera to be activated.
    camera.on('userMedia', function(stream) {
      settings.data.inputType = 'motion';
      this.remote.addStream(stream);
      world.renderer.triggerEvent("webcamEnabled");
    }.bind(this));

    var setInviteStatus = function(obj) {
      if (NetworkState.inviteStatus !== null) {
        if (NetworkState.inviteStatus.name == obj.name) {
          // Same inviteStatus as before.
          console.log('Invite status did not change.');
          return;
        }
        if (obj.redirect) obj = obj.redirect();
        if (NetworkState.inviteStatus.name == obj.name) {
          // Same inviteStatus as before.
          console.log('Invite status remains after redirection.');
          return;
        }
        console.log('Leaving Invite status: ' + NetworkState.inviteStatus.name);
        NetworkState.inviteStatus.active = false;
        NetworkState.inviteStatus.destroy(function () {
          NetworkState.inviteStatus = obj;
          console.log('Entering Invite status: ' + NetworkState.inviteStatus.name);
          NetworkState.inviteStatus.active = true;
          NetworkState.inviteStatus.create();
        }.bind(this));
      } else {
        NetworkState.inviteStatus = obj;
        console.log('Entering Invite status: ' + NetworkState.inviteStatus.name);
          NetworkState.inviteStatus.active = true;
        NetworkState.inviteStatus.create();
      }
    }

    // We are just waiting for a connection:
    var Waiting = {
      name: 'Waiting',
      active: false,
      create: function () {
        $('#headBar').removeClass('active');
        setTimeout(function() {
          if (this.active && NetworkState.host) {
            $('.headBarContent').hide();
            $('.headBarContent.shareLink').show();
            $('#headBar').addClass('active');
          }
        }.bind(this), 1000);
      },
      destroy: function(callback) {
        $('#headBar').removeClass('active');
        $('.headBarContent').hide();
        callback();
      }
    }

    // Waiting for the opponen to choose paddle.
    var WaitForOpponentPaddle = {
      name: 'WaitForOpponentPaddle',
      active: false,
      create: function () {
        setTimeout(function() {
          if (this.active && NetworkState.host) {
            $('.headBarContent.opponentPaddle').show();
            $('#headBar').addClass('active');
          }
        }.bind(this), 1000);
      },
      destroy: function(callback) {
        $('#headBar').removeClass('active');
        $('.headBarContent').hide();
        callback();
      }
    }

    // This room is full:
    var RoomIsFull = {
      name: 'RoomIsFull',
      active: false,
      create: function () {
        $('.multi').hide();
        $('.single').show();
      },
      destroy: function(callback) {
        $('#headBar').removeClass('active');
        $('.headBarContent').hide();
        callback();
      }
    }

    // Players just met:
    var Synchronizing = {
      name: 'Synchronizing',
      active: false,
      create: function() {
        $('.single').hide();
        $('.multi').show();
        setTimeout(function() {
          if (this.active) console.dir('We are active.');
          if (NetworkState.host) console.dir('We are host.');
          if (this.active && NetworkState.host) {
            $('.headBarContent.friendArrived').show();
            $('#headBar').addClass('active');
          }
        }.bind(this), 1000);
      },
      destroy: function(callback) {
        $('#headBar').removeClass('active');
        $('.headBarContent').hide();
        callback();
      },
      redirect: function() {
        if (NetworkState.opponentGameState == 'WebcamActivation' || NetworkState.opponentGameState == 'PaddleSetup') {
          return WaitForOpponentPaddle;
        }
        return this;
      }
    }

    setInviteStatus(Waiting);

    // DataChannel for sending invite data (where in the flow the other user is).
    this.channel = NetworkState.remote.connection.createDataChannel(conferenceRoom + "invitedata");
    this.channel.onmessage = function(e) {
      data = {};
      try {
        data = JSON.parse(e.data);
      } catch(err) {
      }
      if (data.state) {
        console.log('Opponent switched to state: ' + data.state);
        this.opponentGameState = data.state;
        if (data.state == 'WebcamActivation' || data.state == 'PaddleSetup') {
          setInviteStatus(WaitForOpponentPaddle);
        }
      }
    }.bind(this);

    // Send your state to the other player:
    this.game.on('stateChange', function(newState) {
      var data = {
        state: newState
      };
      this.channel.send(JSON.stringify(data));
    }.bind(this));

    // This room is full.
    this.remote.on('full',function(e){
      //document.getElementById('ful').className = ''; // show it
      setInviteStatus(RoomIsFull);
    })

    this.remote.on('open',function(e){
      //document.getElementById('con').className = ''; // show it (Player connected with video)
      // document.getElementById('syn').className = ''; // show it (Synchronizing, startin in X seconds...)

//      if( this.connected )
//        return console.log('already connected');
      // ^^^ IS THERE A GOOD REASON TO TEST FOR THIS?
      setInviteStatus(Synchronizing);

      // game.popState().switchState(MultiState)
    })

    // Camera stream activation:
    this.remote.on('addstream',function(e){
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
      wait();

    })
    this.remote.on('removestream',function(e){
      document.getElementById('vid').className = 'hidden';
      document.getElementById('remoteInput').src = null;
    })
    this.remote.on('disconnect',function(e){
      document.getElementById('con').className = 'hidden';
      document.getElementById('syn').className = 'hidden';
      document.getElementById('vid').className = 'hidden';
      document.getElementById('remoteInput').src = null;
      // game.popState().switchState(SingleState)
      setInviteStatus(Waiting);
    })

    // When NetworkState is initialized, start the Main Menu
    game.pushState(LoadingState)
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

var GameStartState = {
  name: "GameStart",

  create: function() {

    /*

    COUNTDOWN DISABLED (it does not exist in the art direction)

    world.renderer.changeView("play");

    console.log('GameStartState create');

    var element = document.getElementById('gamestartCountdown');
    var countdown = function(nr) {
      console.log(nr);
      if (nr > 0) {
        $(element).html(nr);
        setTimeout(function() { countdown(nr - 1); }, 1000);
      } else {
        $(element).html('');
        */
        if (NetworkState.connect) {
          GameStartState.game.switchState(MultiState);
        } else {
          GameStartState.game.switchState(SingleState);
        }
        /*
      }
    }
    setTimeout(function () {
      countdown(3);
    }, 2500);

    */

  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
  }
}

var SingleState = {
  name: 'Single',

  create: function(){
    console.log('SingleState create')

    world.renderer.activePlayer(world.host ? 0 : 1) /* It there a world.host too? NetworkState.host exists. */
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
    var dc = NetworkState.remote.connection.createDataChannel(conferenceRoom + "gamedata");
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

var GameOverState = {
  name: 'GameOver',
  create: function() {
    world.renderer.changeView("lobby");

    $('.paddleSetup').bind('click', function() {
      PaddleSetupState.nextState = GameOverState;
      this.game.switchState(PaddleSetupState);
    }.bind(this));

   },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    $('.paddleSetup').unbind('click');
  }

}


module.exports = function(){
  new Game()
    .pushState(RootState)
    .run()
}
