var debug = require('debug').enable('game rtc:* actions audio')
  , Game = require('./game')
  , rtc = require('./rtc')
  , TimeSync = require('./time-sync')
  , Simulator = require('./geom-sim')
  , Renderer = require('./renderer-debug')
  , settings = require('./settings')
  , camera = require('./camera')
  , audio = require('./audio')
  , world = require('./world')
  , info = require('./support/info')
  , AI = require('./ai');


/**
 * State Hierarchy:
 *
 * states on the same depth replaces each other while nested
 * states is chained.
 *
 *  - Root (motion/mouse toggle, local video, world, renderer, audio)
 *    - Network (rtc, remote video, invite status)
 *      - Loading (removes itself)
 *      - MainMenu
 *      - WebcamActivation
 *      - PaddleSetup
 *      - TimeSync (time-sync)
 *      - GameStart
 *        - Simulator (actions, physics)
 *          - Play (countdown, ai)
 *          - Pause
 *          - WaitForHost (under GameStart eftersom att den andre spelarens spel ska visas).
 *      - GameOver
 *      - WaitForGuest
 *      - OpponentLeft
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

    // Sound setting is stored in a cookie:
    $('.soundSwitch').click(function() {
      if ($(this).hasClass('on')) {
        $.cookie('sound', 'off');
        $(this).removeClass('on').addClass('off');
        if( settings.data.music )
          audio.stop("soundtrack");
        settings.data.sounds = false;
      } else {
        $.cookie('sound', 'on');
        $(this).removeClass('off').addClass('on');
        if( settings.data.music )
          audio.play("soundtrack");
        settings.data.sounds = true;
      }
      return false;
    });

    if ($.cookie('sound') == 'off') {
      $('.soundSwitch').removeClass('on').addClass('off');
      settings.data.sounds = false;
    } else {
      if( settings.data.music )
        audio.play("soundtrack");
      settings.data.sounds = true;
    }

    $(".notimplemented").each(function() {
      $(this).click(function() {
        alert('Not implemented yet.');
        return false;
      }).css('cursor', 'pointer');
    });

    var canv = document.getElementById('canv-2d');
    world.bounds = [0,settings.data.arenaWidth,settings.data.arenaHeight,0] // used by physics
    world.renderer = new Renderer(canv);

    this.game.inputs
      .bind(this.game.inputs.M,'m')
      .bind(this.game.inputs.O,'o')
      .bind(this.game.inputs["8"],'2d')
      .bind(this.game.inputs["9"],'3d')
      .bind(this.game.inputs["0"],'2d+3d');
    /*
      .bind(this.game.inputs["1"],'cam1')
      .bind(this.game.inputs["2"],'cam2')
      .bind(this.game.inputs["3"],'cam3')
      .bind(this.game.inputs["4"],'skip')
      .bind(this.game.inputs.Q,'gameover')
      .bind(this.game.inputs.L,'opponentLeft')
    */

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

    //toggle debug/settings menu
    if( inputs.pressed('o')) {
      $("#settingsGUIContainer").toggle();
    }

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
      switch(settings.data.inputType){
        case 'mouse': settings.data.inputType = 'motion'; break;
        case 'motion': settings.data.inputType = 'keyboard'; break;
        case 'keyboard': settings.data.inputType = 'mouse'; break;
        default: console.warn('invalid input type',settings.data.inputType);
      }
      console.log('changed input to',settings.data.inputType)
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
          // console.log('Invite status did not change.');
          return;
        }
        if (obj.redirect) obj = obj.redirect();
        if (NetworkState.inviteStatus.name == obj.name) {
          // Same inviteStatus as before.
          // console.log('Invite status remains after redirection.');
          return;
        }
        // console.log('Leaving Invite status: ' + NetworkState.inviteStatus.name);
        NetworkState.inviteStatus.active = false;
        NetworkState.inviteStatus.destroy(function () {
          NetworkState.inviteStatus = obj;
          // console.log('Entering Invite status: ' + NetworkState.inviteStatus.name);
          NetworkState.inviteStatus.active = true;
          NetworkState.inviteStatus.create();
          info.stateHistory('local-invite',obj.name)
        }.bind(this));
      } else {
        NetworkState.inviteStatus = obj;
        console.log('Entering Invite status: ' + NetworkState.inviteStatus.name);
        NetworkState.inviteStatus.active = true;
        NetworkState.inviteStatus.create();
        info.stateHistory('local-invite',obj.name)
      }
    }

    var createInviteDataChannel = function() {
      console.log('createInviteDataChannel()');

      if( this.channel && this.channel.readyState === 'open' ){
        console.log('closing old invite data channel')
        this.channel.close();
      }
      this.channel = this.remote.connection.createDataChannel(conferenceRoom + "invitedata");
      this.channel.onmessage = function(e) {
        var data = {};
        try {
          data = JSON.parse(e.data);
        } catch(err){
          console.error('could not parse message',e.data)
          return;
        }
        if (data.state) {
          if (this.opponentGameState != data.state) {
            console.log('Opponent switched to state: ' + data.state);
            this.opponentGameState = data.state;
            info.stateHistory('remote',data.state)

            switch(this.opponentGameState){

              case 'Root':
              case 'Network':
              case 'Loading':
              case 'MainMenu':
                setInviteStatus(Synchronizing);
                break;

              case 'WebcamActivation':
              case 'PaddleSetup':
                setInviteStatus(WaitForOpponentPaddle);
                break;

              case 'WaitForGuest':
                setInviteStatus(OpponentIsReady);
                break;

              case 'WaitForHost':
                setInviteStatus(OpponentIsReady);
                if (world.host && this.game.hasState(WaitForGuestState)) {
                  OpponentIsReady.letOpponentIn();
                }
                break

              case 'TimeSync':
                // TODO this is a pretty ugly hack
                while(NetworkState.game.hasState(GameStartState) && !NetworkState.game.isState(GameStartState))
                  NetworkState.game.popState()
                NetworkState.game.switchState(TimeSyncState);
                break;

              case 'Play':
                if(this.game.isState(PauseState)){
                  this.game.switchState(PlayState);
                } else {
                  // console.warn('ignoring Play as current state is not Pause')
                }
                break;

              case 'Pause':
                if(this.game.isState(PlayState)){
                  this.game.switchState(PauseState);
                } else {
                  // console.warn('ignoring Pause as current state is not Play')
                }
                break;

              case 'GameOver':
                if(this.game.isState(PlayState)) {
                  while(this.game.hasState(GameStartState) && !this.game.isState(GameStartState))
                    this.game.popState()
                  this.game.switchState(GameOverState);
                  //TODO: Måste kolla så att master inte är i single-mode när vi går till GameOver för guest (efter PaddleSetup exvis).
                } else {
                  // console.warn('ignoring GameOver as current state is not Play')
                }
                break;

              }

            }

        // keepalive ping pong:

        } else if (data.ping) {

          // On first pings, send the current state, to make sure the current state is actually send (the buffered state might be old).
          if (data.ping < 3) {
            this.channel.send(JSON.stringify({state: NetworkState.game.states[NetworkState.game.states.length - 1].name}));
          }

          this.channel.send(JSON.stringify({pong: data.ping}));
          //console.log('ponged ' + data.ping);
          setTimeout(function() {
            this.channel.send(JSON.stringify({ping: (data.ping + 1)}));
          //console.log('pinged ' + (data.ping + 1));
          }.bind(this), 1000);

        } else if (data.pong) {

          if (data.pong == 2 || data.pong == 3) {
            console.log("WEBRTC PEERCONNECTION DATACHANNEL WORKS.");
          }

        } else {
          console.error('got unexpected invitedata:',e.data);
        }
      }.bind(this);

      this.channel.send(JSON.stringify({ping: 1}));
      this.channel.send(JSON.stringify({state: NetworkState.game.states[NetworkState.game.states.length - 1].name}));

    }.bind(this);

    // We are just waiting for a connection:
    var Waiting = {
      name: 'Waiting',
      active: false,
      create: function () {

        TimeSyncState.createdAnytime = false;

        $('#headBar').removeClass('playingmulti');
        this.timeout = setTimeout(function() {
          if (this.active && world.host) {
            $('#headBar').addClass('shareLink');
          }
        }.bind(this), 1000);
      },
      destroy: function(callback) {
        destroyState(this)
        $('#headBar').removeClass('shareLink');
        clearTimeout(this.timeout)
        callback();
      }
    }

    // Players just met:
    var Synchronizing = {
      name: 'Synchronizing',
      active: false,
      create: function() {
        createState(this)
        $('.singleplayer').hide();
        $('.multiplayer').show();
        this.timeout = setTimeout(function() {
          if (this.active && world.host) {
            $('#headBar').addClass('friendArrived');
          }
        }.bind(this), 1000);
      },
      destroy: function(callback) {
        destroyState(this)
        $('#headBar').removeClass('friendArrived');
        clearTimeout(this.timeout)
        callback();
      },
      redirect: function() {
        if (NetworkState.opponentGameState == 'WebcamActivation' || NetworkState.opponentGameState == 'PaddleSetup') {
          return WaitForOpponentPaddle;
        }
        return this;
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
        callback();
      }
    }

    // Waiting for the opponent to choose paddle.
    var WaitForOpponentPaddle = {
      name: 'WaitForOpponentPaddle',
      active: false,
      create: function () {
        createState(this)
        this.timeout = setTimeout(function() {
          if (this.active && world.host) {
            $('#headBar').addClass('opponentPaddle');
          }
        }.bind(this), 1000);
      },
      destroy: function(callback) {
        destroyState(this)
        $('#headBar').removeClass('opponentPaddle');
        clearTimeout(this.timeout)
        callback();
      }
    }

    // Opponent is ready to play Multi
    var OpponentIsReady = {
      name: 'OpponentIsReady',
      active: false,
      create: function() {
        createState(this);
        if (NetworkState.game.hasState('WaitForGuest')) {
          this.letOpponentIn();
        } else {
          $('#letOpponentIn').bind('click', this.letOpponentIn);
          this.timeout = setTimeout(function() {
            if (this.active && world.host) {
              $('#headBar').addClass('opponentReady');
            }
          }.bind(this), 1000);
        }
      },
      letOpponentIn: function() {
        $('#headBar').addClass('playingmulti');
        setInviteStatus(InviteCompleted);
        while(NetworkState.game.hasState(GameStartState) && !NetworkState.game.isState(GameStartState))
          NetworkState.game.popState()
        NetworkState.game.switchState(TimeSyncState);
        world.renderer.swapToVideoTexture();
      },
      destroy: function(callback) {
        destroyState(this)
        $('.letOpponentIn').unbind('click', this.letOpponentIn);
        $('#headBar').removeClass('opponentReady');
        clearTimeout(this.timeout)
        callback();
      }
    };

    // Invite completed - we are/have been playing.
    var InviteCompleted = {
      name: 'InviteCompleted',
      active: false,
      create: function() {
        createState(this);
      },
      destroy: function(callback) {
        destroyState(this);
        callback();
      }
    };

    setInviteStatus(Waiting);

    $.ajax({
      url: "/channeltoken/" + (new Date()).getTime(),
      type: "POST",
      data: {
        roomName: conferenceRoom,
        clientId: getCookie("clientId")
      },
      dataType: "json",
      error: function() {
        alert("Out of Google Channel API quotas.");
      },
      success: function(data) {
        console.dir(data);
        var channelToken = data.token;

        // channelToken & conferenceRoom are declared in html. clientId is a cookie.
        this.remote = rtc.connect(channelToken, conferenceRoom, getCookie("clientId"))
        this.remote.on('open', createInviteDataChannel);
        this.remote.on('offer', createInviteDataChannel);
        this.remote.on('answer', createInviteDataChannel);
        this.remote._sendOffer();

        this.remote.on('participantsUpdated', function(p) {
          oldParticipants = p.oldParts;
          participants = p.newParts;
          console.log("Participants: " + participants);
          if (participants[0] == getCookie("clientId")) {

            var wasHost = world.host;
            world.host = true
            console.log('I am host');
            info.hostStatus(true)
            $('body').addClass('Host').removeClass('Guest');
            $('.host').show();
            $('.slave').hide();
            LoadingState && this.game.switchState(MainMenuState);

            // If I became host, and I was in waiting-for-host-mode:
            if (NetworkState.game.hasState(WaitForHostState) && !wasHost && GameStartState.channel == null) {
              NetworkState.game.popState();
              NetworkState.game.popState();
              NetworkState.game.switchState(OpponentLeftState);
            }

          } else {

            world.host = false
            info.hostStatus(false)
            console.log('I am not host');

            $('body').removeClass('Host').addClass('Guest');
            $('.host').hide();
            $('.slave').show();
            LoadingState && this.game.switchState(MainMenuState);

          }
          if (participants.length > 1) {
            if (NetworkState.inviteStatus.name == 'Waiting') {
              setInviteStatus(Synchronizing);

            }
            console.log('We are not alone here.');

          } else {
            setInviteStatus(Waiting);
            console.log('We are alone here.');
          }

        }.bind(this));
        setTimeout(function() { // process.nextTick is not implemented @ web browser
          this.remote.emit('participantsUpdated', {
            oldParts: [],
            newParts: roomParticipants.split("|")
          });
        }.bind(this), 0);

        // Camera stream activation:
        this.remote.on('addstream',function(e){
          var remoteVideo = document.getElementById('remoteInput');
          remoteVideo.src = window.webkitURL.createObjectURL(e.stream);
          world.renderer.triggerEvent('remoteVideoAvailable', {visible:true});
        })
        this.remote.on('removestream',function(e){
          world.renderer.triggerEvent('remoteVideoAvailable', {visible:false});
          document.getElementById('remoteInput').src = null;
        })
        this.remote.on('datachannel',function(e){
          info.dataChannel(e.channel);
        })
        this.remote.on('disconnect',function(e){
          console.log('RTC PeerConnection was disconnected.');
          world.renderer.triggerEvent('remoteVideoAvailable', {visible:false});
          document.getElementById('remoteInput').src = null;
          setInviteStatus(Waiting);
          if (GameStartState.channel !== null) {
            // TODO this is a pretty ugly hack
            while(this.game.hasState(GameStartState) && !this.game.isState(GameStartState))
              this.game.popState()
            this.game.switchState(OpponentLeftState);
          }
        }.bind(this))

        // Send your state to the other player:
        this.game.on('pushState', function(newState) {
          info.stateHistory('local',newState)
          console.log('state pushed to remote: ' + newState);
          this.channel && this.channel.send(JSON.stringify({state: newState}));
        }.bind(this));

        this.remote.on('full',function(e){
          setInviteStatus(RoomIsFull);
        })

        // When NetworkState is initialized, start the Main Menu
        game.pushState(LoadingState)
      }.bind(this)
    });

  },

  destroy: function(){
    destroyState(this)
    this.remote.off('promoted')
    this.remote.off('demoted')
    this.remote.off('full')
    this.remote.off('open')
    this.remote.off('close')
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

    this.timeout = setTimeout(function() {
      $('#headBar').addClass('loginInfo');
    }.bind(this), 1000);

    // shortcut
    if( window.location.href.indexOf("play") != -1) {
      settings.data.inputType = 'mouse';
      this.game.switchState(GameStartState);
    }

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
    clearTimeout(this.timeout)
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  }

}

var WebcamActivationState = {
  name: 'WebcamActivation',
  nextState: null, // If null, WebcamActivationState will go to PaddleSetupState's nextState on webcam errors.
  create: function() {
    createState(this)
    world.renderer.changeView("webcamActivation", function(){
      camera.start();
    });

    camera.on('userMedia', this.cameraOn);
    camera.on('userMediaError', this.cameraOff);
  },

  cameraOn: function() {
    world.webcam = true;
    world.renderer.triggerEvent('webcamEnabled');
    WebcamActivationState.game.switchState(this.nextState || PaddleSetupState);
  },

  cameraOff: function() {
    settings.data.inputType = 'keyboard';

    camera.hide();

    WebcamInformationState.nextState = this.nextState;
    WebcamActivationState.game.switchState(WebcamInformationState);

  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    camera.hide();
    camera.off('userMedia', this.cameraOn);
    camera.off('userMediaError', this.cameraOff);
    destroyState(this)
  }

}

var WebcamInformationState = {
  name: "WebcamInformation",

  create: function() {
    createState(this);

    $('#activateCamera').on('click', function() {
      WebcamInformationState.game.switchState(WebcamActivationState);
    });

    $('.WebcamInformation .keyboard').on("click", function() {
      settings.data.inputType = 'keyboard';
      if (NetworkState.game.hasState(GameStartState)) {
        NetworkState.game.switchState(this.nextState || PlayState);
      } else {
        NetworkState.game.switchState(this.nextState || GameStartState);
      }
    }.bind(this));

  },
  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    destroyState(this);
    $('#activateCamera').off('click');
    $('.WebcamInformation .keyboard').off("click");
  }

}

var PaddleSetupState = {
  name: 'PaddleSetup',

  nextState: null,
  scanned: false, // This boolean tell wheather the user ever configured his/her paddle.

  create: function() {
    createState(this)

    if (!world.webcam) {
      WebcamActivationState.nextState = null; // If null, WebcamActivationState will go to PaddleSetupState's nextState on webcam errors.
      this.game.switchState(WebcamActivationState);
      return;
    }

    world.renderer.changeView("paddleSetup");

    $("#scanButton").bind("click",function(){
      settings.data.inputType = 'motion';
      this.scanned = true;
      world.renderer.triggerEvent("scan");
      this.game.inputs.tracker.updateTrackingColor(true)

      this.timeout = setTimeout(function(){

        //special case if coming from Game Over
        if(this.nextState == GameOverState ) {
          if (world.host) {
            if (NetworkState.inviteStatus.name == "Waiting" || NetworkState.inviteStatus.name == "Synchronizing" || TimeSyncState.createdAnytime == false) {
              this.game.switchState(GameStartState);
              $('#headBar').removeClass('playingmulti');
            } else if (NetworkState.inviteStatus.name == 'OpponentIsReady') {
               NetworkState.inviteStatus.letOpponentIn();
            } else {
              this.game.switchState(WaitForGuestState);
            }
          } else {
             NetworkState.game.switchState(GameStartState);
          }
        }
        else if(this.nextState == PauseState ) {
          NetworkState.game.switchState(PlayState);
        }
        else {
          if (NetworkState.game.hasState(GameStartState)) {
            NetworkState.game.switchState(this.nextState || PlayState);
          } else {
            NetworkState.game.switchState(this.nextState || GameStartState);
          }  
        }

        
      }.bind(this),1000)
    }.bind(this));

    $('.PaddleSetup .keyboard').on("click", function() {
      settings.data.inputType = 'keyboard';
      if (NetworkState.game.hasState(GameStartState)) {
        NetworkState.game.switchState(this.nextState || PlayState);
      } else {
        NetworkState.game.switchState(this.nextState || GameStartState);
      }
    }.bind(this));

    this.game.inputs
      .bind(this.game.inputs.SPACE, 'next');

  },

  controls: function(inputs){
    if (inputs.pressed('next')) {
      $("#scanButton").trigger("click")
    } else {
      inputs.tracker.updateTrackingColor(false)
    }
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    destroyState(this)
    $("#scanButton").off("click")
    $(".PaddleSetup .keyboard").off("click")
    this.game.inputs.unbind(this.game.inputs.SPACE);
    this.nextState = null
    clearTimeout(this.timeout)
  }

};


var TimeSyncState = {
  name: 'TimeSync',

  createdAnytime: false, // Used to decide wheather host should go into single user or multi user after game over. If host never selected to play multi, single player will be default.

  latency: undefined,

  create: function(){
    createState(this)

    this.createdAnytime = true;

    // already synced
    // TODO reset sometime?
    if( this.latency !== undefined && GameStartState.channel ){
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
    if (world.host) {
      this.game.pushState(PlayState);
    } else {
      if (this.channel !== null) {
        this.game.pushState(PlayState);
        world.renderer.swapToVideoTexture();
      } else {
        this.game.pushState(WaitForHostState);
      }
    }
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    destroyState(this)
    this.simulator = null
    if( this.channel ){
      this.channel.close()
      this.channel = null
    }
  }
}


var PlayState = {
  name: 'Play',


  create: function(){
    createState(this)

    // just in case we're not already here...
    world.renderer.changeView("play");

    if( GameStartState.channel ) world.renderer.swapToVideoTexture();

    if( !GameStartState.simulator )
      throw new Error('no simulator in GameStartState');

    // only in multiplayer should we have a channel
    // only in singleplayer should we have an AI
    if( !GameStartState.channel ){
      this.ai = new AI();
      $("#scoreRally").hide();
    }
    else {
      $("#scoreRally").show();
    }

    var element = $('#gamestartCountdown');
    var gameInstructions = $('#gameInstructions');

    var countdown = function(nr) {
      if (nr > 0) {
        element.html(nr);
        gameInstructions.removeClass('inactive');
        this.timeout = setTimeout(function(){countdown(nr - 1)}, 1000);
      } else {
        element.html('');
        gameInstructions.addClass('inactive');

        world.host && GameStartState.simulator.resume()
        this.game.inputs
          .bind(this.game.inputs.ESC, 'pause')
          .bind(this.game.inputs.SPACE, 'pause');
      }
    }.bind(this)

    // wait until we're in play view
    var offset = TimeSyncState.latency || 0;
    this.timeout = setTimeout(function(){ countdown(3) }, 2500 - offset);
  },

  controls: function(inputs) {
    if( world.paused ) return;
    if( this.ai && this.ai.update(world) ){
      inputs.ai = this.ai.position;
    }
    if (this.game.isState(this) && inputs.pressed('pause')) {
      this.game.switchState(PauseState);
    }

    if( world.over ){
      world.paused = true;
      // wait for the bear cheer
      this.gameOverTimeout = setTimeout(function(){
        this.game
          .popState() // play
          .popState() // simulator
          .switchState(GameOverState); // GameStart -> GameOver
      }.bind(this),4000);
    }
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function(){
    destroyState(this)
    clearTimeout(this.timeout)
    clearTimeout(this.gameOverTimeout)
    this.game.inputs.unbind(this.game.inputs.SPACE);
    this.game.inputs.unbind(this.game.inputs.ESC);
    this.ai = null

    world.host && GameStartState.simulator.pause()

    //add a delay if game over?
    //this.timeout = setTimeout(function(){world.renderer.changeView("lobby")}.bind(this),world.over?3000,0);

    world.renderer.changeView("lobby");
  }

}

var OpponentLeftState = {
  name: 'OpponentLeft',
  create: function() {
    createState(this)

    world.renderer.triggerEvent('friendLeft');

    $('.state.OpponentLeft .paddleSetup').bind('click', function() {
      PaddleSetupState.nextState = OpponentLeftState;
      this.game.switchState(PaddleSetupState);
    }.bind(this));
    $('.state.OpponentLeft .play').each(function() {
      $(this).bind('click', function() {
        OpponentLeftState.game.switchState(GameStartState);
      });
    });

    this.timeout = setTimeout(function(){
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
    clearTimeout(this.timeout)
    destroyState(this)
    this.game.inputs.unbind(this.game.inputs.SPACE);
    $('.paddleSetup').unbind('click');
    $('.state.OpponentLeft .play').each(function() {
      $(this).unbind('click');
    });
  }
}


var WaitForHostState = {
  name: 'WaitForHost',

  create: function() {
    createState(this)

    console.log('WaitForHostState.create()');

    world.renderer.changeView("waitingForGameStart");

    /*
    $('.state.WaitForHost .paddleSetup').bind('click', function() {
      PaddleSetupState.nextState = WaitForHostState;
      this.game.switchState(PaddleSetupState);
    }.bind(this));

    $('.state.WaitForHost .playcomputer').each(function() {
      $(this).bind('click', function() {
        WaitForHostState.game.switchState(PlayState);
      });
    });
    */

    /*
    setTimeout(function(){
      this.game.inputs
        .bind(this.game.inputs.SPACE, 'resume');
    }.bind(this),1000)
    */
  },

  controls: function(inputs) {
    /*
    if (inputs.pressed('resume')) {
      this.game.switchState(PlayState);
    }
    */
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    destroyState(this)
    this.game.inputs.unbind(this.game.inputs.SPACE);
    $('.state.WaitForHost .paddleSetup').unbind('click');
    $('.state.WaitForHost .quit').unbind('click');
    $('.state.WaitForHost .play').unbind('click');
  }

}

var WaitForGuestState = {
  name: 'WaitForGuest',

  create: function() {
    createState(this)

    world.renderer.changeView("waitingForGameStart");

    /*
    $('.state.WaitForGuest .paddleSetup').bind('click', function() {
      PaddleSetupState.nextState = WaitForGuestState;
      this.game.switchState(PaddleSetupState);
    }.bind(this));

    $('.state.WaitForGuest .playcomputer').each(function() {
      $(this).bind('click', function() {
        WaitForGuestState.game.switchState(GameStartState);
      });
    });
    */

    this.timeout = setTimeout(function(){
      this.game.inputs
        .bind(this.game.inputs.SPACE, 'resume');
    }.bind(this),1000)
  },

  controls: function(inputs) {
    if (inputs.pressed('resume')) {
      this.game.switchState(GameStartState);
    }
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    destroyState(this)
    clearTimeout(this.timeout)
    this.game.inputs.unbind(this.game.inputs.SPACE);
    $('.state.WaitForGuest .paddleSetup').unbind('click');
    $('.state.WaitForGuest .quit').unbind('click');

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

    /*
    $('.state.Pause .quit').each(function() {
    });
    */

    this.timeout = setTimeout(function(){
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
    clearTimeout(this.timeout)
    this.game.inputs.unbind(this.game.inputs.SPACE);
    $('.state.Pause .paddleSetup').unbind('click');
    // $('.state.Pause .quit').unbind('click');
    $('.state.Pause .play').unbind('click');
  }

}


var GameOverState = {
  name: 'GameOver',
  create: function() {
    createState(this)

    //possible to add delay to show last point and bear-gesture?
    //this.timeout = setTimeout(function(){world.renderer.changeView("lobby")}.bind(this),3000);
    world.renderer.changeView("lobby")


    $('.paddleSetup').bind('click', function() {
      PaddleSetupState.nextState = GameOverState;
      
      this.game.switchState(PaddleSetupState);
    }.bind(this));
    $('#gameOverDialog .play').bind('click', function() {

      this.restart();

      return false;
    }.bind(this));

    this.timeout = setTimeout(function(){
      this.game.inputs
        .bind(this.game.inputs.SPACE, 'restart');
    }.bind(this),1000)
  },

  controls: function(inputs) {
    if (inputs.pressed('restart')) {
      this.restart();
    }
  },

  restart: function() {
    if (world.host) {
      if (NetworkState.inviteStatus.name == "Waiting" || NetworkState.inviteStatus.name == "Synchronizing" || TimeSyncState.createdAnytime == false) {
        this.game.switchState(GameStartState);
        $('#headBar').removeClass('playingmulti');
      } else if (NetworkState.inviteStatus.name == 'OpponentIsReady') {
         NetworkState.inviteStatus.letOpponentIn();
      } else {
        this.game.switchState(WaitForGuestState);
      }
    } else {
       NetworkState.game.switchState(GameStartState);
    }

  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    destroyState(this)
    clearTimeout(this.timeout)
    this.game.inputs.unbind(this.game.inputs.SPACE);
    $('.paddleSetup').unbind('click');
    $('#gameOverDialog .play').unbind('click');
  }

}


module.exports = function(){
  new Game()
    .pushState(RootState)
    .run()
}
