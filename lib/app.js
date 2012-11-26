var debug = require('debug').enable('game actions')
  , Game = require('./game')
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
 *        - TimeSync (time-sync)
 *        - GameStart (countdown)
 *          - Play (ai)
 *            - Simulator (actions, physics)
 */


function createState(state){
  $('body').addClass(state.name);
  $('.state.' + state.name).addClass('active').removeClass('inactive');
}
function destroyState(state){
  $('body').removeClass(state.name);
  $('.state.' + state.name).removeClass('active').addClass('inactive');
}

var RootState = {
  name: 'Root',

  create: function() {
    createState(this)

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
      .bind(this.game.inputs["1"],'cam1')
      .bind(this.game.inputs["2"],'cam2')
      .bind(this.game.inputs["3"],'cam3')
      .bind(this.game.inputs.L,'l')
      .bind(this.game.inputs["4"],'skip')
      .bind(this.game.inputs.Q,'gameover')
      .bind(this.game.inputs.L,'opponentLeft')
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
    if( inputs.pressed('pause') )
      this.game.switchState(PauseState);
    if( inputs.pressed('opponentLeft') )
      this.game.switchState(OpponentLeftState);

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
    destroyState(this)
    this.game.popState();
  }

}

var NetworkState = {
  name: 'Network',
  remote: null,
  host: false, // True or false.
  inviteStatus: null,
  opponentGameState: null, // State of the opponent.
  channel: null, // A DataChannel for invite status messages.

  create: function(){
    createState(this)

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
      world.host = true
      console.log('I am host');
      $('.host').show();
      $('.slave').hide();
      LoadingState && this.game.switchState(MainMenuState);
    }.bind(this));
    this.remote.on('demoted',function(e){
      world.host = false
      console.log('I am not host');
      $('.host').hide();
      $('.slave').show();
      LoadingState && this.game.switchState(MainMenuState);
    }.bind(this));

    // Wait for camera to be activated.
    camera.on('userMedia', function(stream) {
      settings.data.inputType = 'motion';
      this.remote.addStream(stream);
      //world.renderer.triggerEvent("webcamEnabled");
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
        createState(this)
        $('#headBar').removeClass('active');
        setTimeout(function() {
          if (this.active && world.host) {
            $('.headBarContent').hide();
            $('.headBarContent.shareLink').show();
            $('#headBar').addClass('active');
          }
        }.bind(this), 1000);
      },
      destroy: function(callback) {
        destroyState(this)
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
        createState(this)
        setTimeout(function() {
          if (this.active && world.host) {
            $('.headBarContent.opponentPaddle').show();
            $('#headBar').addClass('active');
          }
        }.bind(this), 1000);
      },
      destroy: function(callback) {
        destroyState(this)
        $('#headBar').removeClass('active');
        $('.headBarContent').hide();
        callback();
      }
    }

    // This room is full:
    var RoomIsFull = { // Server should stop this at html load. This should never happen.
      name: 'RoomIsFull',
      active: false,
      create: function () {
        createState(this)
        $('.multiplayer').hide();
        $('.singleplayer').show();
      },
      destroy: function(callback) {
        destroyState(this)
        $('#headBar').removeClass('active');
        $('.headBarContent').hide();
        callback();
      }
    }

    // Opponent is ready to play Multi
    var OpponentIsReady = {
      name: 'OpponentIsReady',
      active: false,
      create: function() {
        createState(this)
        $('#letOpponentIn').bind('click', this.letOpponentIn);
        setTimeout(function() {
          if (this.active && world.host) {
            $('.headBarContent.opponentReady').show();
            $('#headBar').addClass('active');
          }
        }.bind(this), 1000);
      },
      letOpponentIn: function() {

        world.renderer.swapToVideoTexture();

        while(game.hasState(GameStartState) && !game.isState(GameStartState))
          game.popState()
        NetworkState.game.switchState(TimeSyncState);

      },
      destroy: function(callback) {
        destroyState(this)
        $('.letOpponentIn').unbind('click', this.letOpponentIn);
        $('#headBar').removeClass('active');
        $('.headBarContent').hide();
        callback();
      }
    };

    // Players just met:
    var Synchronizing = {
      name: 'Synchronizing',
      active: false,
      create: function() {
        createState(this)
        $('.singleplayer').hide();
        $('.multiplayer').show();
        setTimeout(function() {
          if (this.active && world.host) {
            $('.headBarContent.friendArrived').show();
            $('#headBar').addClass('active');
          }
        }.bind(this), 1000);
      },
      destroy: function(callback) {
        destroyState(this)
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

    // This room is full.
    this.remote.on('full',function(e){
      //document.getElementById('ful').className = ''; // show it
      setInviteStatus(RoomIsFull);
    })

    this.remote.on('open',function(e){

      // DataChannel for sending invite data (where in the flow the other user is).
      this.channel = this.remote.connection.createDataChannel(conferenceRoom + "invitedata");
      this.channel.onmessage = function(e) {
        data = {};
        console.log(e.data);
        try { data = JSON.parse(e.data); }catch(err){}
        if (data.state) {
          console.log('Opponent switched to state: ' + data.state);
          this.opponentGameState = data.state;
          if (data.state == 'WebcamActivation' || data.state == 'PaddleSetup') {
            setInviteStatus(WaitForOpponentPaddle);
          }
          if (data.state == 'GameStart') {
            setInviteStatus(OpponentIsReady);
          }
          if (data.state == 'TimeSync') {
            while(this.game.hasState(GameStartState) && !this.game.isState(GameStartState))
              this.game.popState()
            this.game.switchState(TimeSyncState);
          }
          if (data.state == 'Play' && this.game.isState(PauseState)) {
            this.game.switchState(PlayState);
          }
          if (data.state == 'Pause' && this.game.isState(PlayState)) {
            this.game.switchState(PauseState);
          }
        }
      }.bind(this);

      // Send your state to the other player:
      this.game.on('pushState', function(newState) {
        this.channel.send(JSON.stringify({state: newState}));
      }.bind(this));

      setInviteStatus(Synchronizing);
    }.bind(this))

    // Camera stream activation:
    this.remote.on('addstream',function(e){
      var remoteVideo = document.getElementById('remoteInput');
      remoteVideo.src = window.webkitURL.createObjectURL(e.stream);

      world.renderer.triggerEvent('remoteVideoAvailable', {visible:true});

      // wait until the video actually has started before adding it to the
      // simulator.
      // TODO this is a hack, there must be a better way...
      /*function wait(){
        if (e.stream.videoTracks.length === 0 || remoteVideo.currentTime > 0) {
          world.renderer.swapToVideoTexture();
        } else {
          setTimeout(wait, 100);
        }
      }
      wait();*/

    })
    this.remote.on('removestream',function(e){
      world.renderer.triggerEvent('remoteVideoAvailable', {visible:false});
      document.getElementById('remoteInput').src = null;
    })
    this.remote.on('disconnect',function(e){
      world.renderer.triggerEvent('remoteVideoAvailable', {visible:false});
      document.getElementById('remoteInput').src = null;
      setInviteStatus(Waiting);
      if (this.game.isState(PlayState) && GameStartState.channel !== null) {
        this.game.popState();
        this.game.popState();
        this.game.switchState(OpponentLeftState);
      }
    }.bind(this))

    // When NetworkState is initialized, start the Main Menu
    game.pushState(LoadingState)
  },

  destroy: function(){
    destroyState(this)
    this.remote.off('promoted')
    this.remote.off('demoted')
    this.remote.off('full')
    this.remote.off('open')
    this.remote.off('addstream')
    this.remote.off('disconnect')
    this.remote = null;
    document.getElementById('remoteInput').src = null;
  }

}

var LoadingState = {
  name: 'Loading',
  create: function() {
    createState(this)
  },
  destroy: function() {
    destroyState(this)

    LoadingState = false; // We will never have to return to this state.
    $('.state.Loading').remove();
  }
}

var MainMenuState = {
  name: 'MainMenu',
  nextState: null,

  create: function(){
    createState(this)

    $('#mainmenu .play').bind('click', function() {
      this.game.switchState(this.nextState || WebcamActivationState);
    }.bind(this));

    // invert the renderer if player is guest
    world.renderer.activePlayer(world.host ? 0 : 1)
    world.renderer.changeView("lobby");

    this.game.inputs
      .bind(this.game.inputs.SPACE, 'next');

  },

  controls: function(inputs) {
    if (inputs.pressed('next')) {
      this.game.switchState(this.nextState || WebcamActivationState);
    }
  },

  destroy: function(){
    destroyState(this)
    this.nextState = null;
    this.game.inputs.unbind(this.game.inputs.SPACE);
    $('.MainMenu .play').unbind('click');
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  }

}

var WebcamActivationState = {
  name: 'WebcamActivation',
  create: function() {
    createState(this)
    world.renderer.changeView("webcamActivation");
    camera.on('userMedia', function(){
      world.renderer.triggerEvent('webcamEnabled');
      this.game.switchState(PaddleSetupState);
    }.bind(this));
    camera.start();
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    destroyState(this)
  }

}

var PaddleSetupState = {
  name: 'PaddleSetup',

  nextState: null,

  scanned: false, // This boolean tell wheather the user ever configured his/her paddle.

  create: function() {
    createState(this)

    world.renderer.changeView("paddleSetup");

    $("#scanButton").one("click",function(){
      this.scanned = true;
      world.renderer.triggerEvent("scan");
      this.game.inputs.tracker.updateTrackingColor()
      $(this).fadeOut(200);

      setTimeout(function(){

        this.game.switchState(this.nextState || GameStartState);
      }.bind(this),1000)
    }.bind(this));

    this.game.inputs
      .bind(this.game.inputs.SPACE, 'next');

  },

  controls: function(inputs){
    if (inputs.pressed('next')) {
      this.game.switchState(this.nextState || GameStartState);
    } else {
      inputs.tracker.updateTrackingColor()
    }
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    destroyState(this)
    $("#scanButton").off("click")
    this.game.inputs.unbind(this.game.inputs.SPACE);
    this.nextState = null
  }

};


var TimeSyncState = {
  name: 'TimeSync',

  latency: undefined,

  create: function(){
    createState(this)

    // already synced
    // TODO reset sometime?
    if( this.latency !== undefined && PlayState.channel ){
      return this.game.switchState(GameStartState);

    }

    // Use time-sync to sync the time between the peers
    // before going to the PlayState
    var dc = NetworkState.remote.connection.createDataChannel(conferenceRoom + "gamedata");
    TimeSync(dc)
      .on('timeout',function(){
        console.error('time sync timed out')
      })
      .on('done',function(host){
        console.log('time sync (was host? %s), latency:',host,this.latency)
        GameStartState.channel = dc;
        TimeSyncState.latency = this.latency;
        TimeSyncState.game.switchState(GameStartState);
      })
      .start(world.host)
    console.log('starting time sync.', world.host ? 'as host' : 'as guest')
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function(){
    destroyState(this)
  }

}


var GameStartState = {
  name: "GameStart",

  simulator: null,
  channel: null,    // should be set by TimeSync

  create: function() {
    createState(this)

    world.renderer.changeView("play");
    world.renderer.activePlayer(world.host ? 0 : 1)

    this.simulator = new Simulator();
    this.simulator.channel = this.channel;
    this.game.pushState(this.simulator)
    this.game.pushState(PlayState);
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    destroyState(this)
    this.simulator = null
    this.channel = null
  }
}


var PlayState = {
  name: 'Play',


  create: function(){
    createState(this)

    // just in case we're not already here...
    world.renderer.changeView("play");

    if( !GameStartState.simulator )
      throw new Error('no simulator in GameStartState');

    // only in multiplayer should we have a channel
    // only in singleplayer should we have an AI
    if( !GameStartState.channel ){
      this.ai = new AI();
    }

    var element = $('#gamestartCountdown');
    var countdown = function(nr) {
      console.log(nr);
      if (nr > 0) {
        element.html(nr);
        setTimeout(function(){countdown(nr - 1)}, 1000);
      } else {
        element.html('');
        GameStartState.simulator.resume()
      }
    }

    // wait until we're in play view
    var offset = TimeSyncState.latency || 0;
    setTimeout(function(){
      // COUNTDOWN DISABLED (it does not exist in the art direction)
      // countdown(3);
      GameStartState.simulator.resume()
      this.game.inputs
        .bind(this.game.inputs.SPACE, 'pause');
    }.bind(this), 2500 - offset);

  },

  controls: function(inputs) {
    if( this.ai && this.ai.update(world) ){
      inputs.ai = this.ai.position;
    }
    if (this.game.isState(this) && inputs.pressed('pause')) {
      this.game.switchState(PauseState);
    }

    if( world.over ){
      world.over = false
      this.game
        .popState() // play
        .popState() // simulator
        .switchState(GameOverState); // GameStart -> GameOver
    }
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function(){
    destroyState(this)
    this.game.inputs.unbind(this.game.inputs.SPACE);
    this.ai = null
    GameStartState.simulator.pause()
    world.renderer.changeView("lobby");
  }

}

var OpponentLeftState = {
  name: 'OpponentLeft',
  create: function() {
    createState(this)
    $('.state.OpponentLeft .paddleSetup').bind('click', function() {
      PaddleSetupState.nextState = OpponentLeftState;
      this.game.switchState(PaddleSetupState);
    }.bind(this));
    $('.state.OpponentLeft .play').each(function() {
      $(this).bind('click', function() {
        OpponentLeftState.game.switchState(GameStartState);
      });
    });

    setTimeout(function(){
      this.game.inputs
        .bind(this.game.inputs.SPACE, 'restart');
    }.bind(this),1000)
  },

  controls: function(inputs) {
    if (inputs.pressed('restart')) {
      this.game.switchState(GameStartState);
    }
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    destroyState(this)
    this.game.inputs.unbind(this.game.inputs.SPACE);
    $('.paddleSetup').unbind('click');
  }

}

var PauseState = {
  name: 'Pause',
  create: function() {
    createState(this)

    $('.state.Pause .paddleSetup').bind('click', function() {
      PaddleSetupState.nextState = PauseState;
      this.game.switchState(PaddleSetupState);
    }.bind(this));

    $('.state.Pause .play').each(function() {
      $(this).bind('click', function() {
        PauseState.game.switchState(PlayState);
      });
    });

    setTimeout(function(){
      this.game.inputs
        .bind(this.game.inputs.SPACE, 'resume');
    }.bind(this),1000)
  },

  controls: function(inputs) {
    if (inputs.pressed('resume')) {
      this.game.switchState(PlayState);
    }
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    destroyState(this)
    this.game.inputs.unbind(this.game.inputs.SPACE);
    $('.state.Pause .paddleSetup').unbind('click');
    $('.state.Pause .play').unbind('click');
  }

}


var GameOverState = {
  name: 'GameOver',
  create: function() {
    createState(this)
    world.renderer.changeView("lobby");

    $('.paddleSetup').bind('click', function() {
      PaddleSetupState.nextState = GameOverState;
      this.game.switchState(PaddleSetupState);
    }.bind(this));

    setTimeout(function(){
      this.game.inputs
        .bind(this.game.inputs.SPACE, 'restart');
    }.bind(this),1000)
  },

  controls: function(inputs) {
    if (inputs.pressed('restart')) {
      this.game.switchState(GameStartState);
    }
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    destroyState(this)
    this.game.inputs.unbind(this.game.inputs.SPACE);
    $('.paddleSetup').unbind('click');
  }

}


module.exports = function(){
  new Game()
    .pushState(RootState)
    .run()
}
