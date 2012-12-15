var debug = require('debug').enable('game rtc:*')
  , Game = require('./game')
  , rtc = require('./rtc')
  , TimeSync = require('./time-sync')
  , Simulator = require('./geom-sim')
  , Renderer = require('./renderer-debug')
  , settings = require('./settings')
  , localization = require('./localization')
  , camera = require('./camera')
  , audio = require('./audio')
  , world = require('./world')
  , info = require('./support/info')
  , AI = require('./ai')
  , Puppeteer = require('./puppeteer')
  , Editor = require('./level-editor')
  , selectText = require('./support/select-text')
  , cookie = require('cookie')
  , $ = require('jquery');


/**
 * State Hierarchy:
 *
 * states on the same depth replaces each other while nested
 * states is chained.
 *
 *  - Root (keyboard/mouse toggle, local video, world, renderer, audio)
 *    - Network (rtc, remote video)
 *      - Loading (removes itself)
 *      - MainMenu
 *      - InviteFriend
 *      - FriendArrived
 *      - WaitingFriend
 *      - WebcamActivation
 *      - WebcamInformation
 *      - WaitForFriendCamera
 *      - TimeSync (time-sync)
 *      - GameInformation
 *      - GameStart
 *        - Simulator (actions, physics)
 *          - Play (countdown, ai)
 *          - Pause
 *      - GameOver
 *      - WaitForGameStart
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
  acceptLanguage: 'en',

  create: function() {
    createState(this)

    localization.init(this.acceptLanguage);
    localization.on('load', function() {
      var langs = localization.availLanguages();
      if (langs.length < 2) {
        $('#localizationSwitch').closest('li').hide();
      } else {
        $('#localizationSwitch').html(langs.join('/')).click(function(e) {
          e.preventDefault();
          localization.nextLanguage();
          return false;
        });
      }
    });

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
        cookie('sound', 'off');
        $(this).removeClass('on').addClass('off');
        if( settings.data.music )
          audio.stop("soundtrack");
        settings.data.sounds = false;
      } else {
        cookie('sound', 'on');
        $(this).removeClass('off').addClass('on');
        if( settings.data.music )
          audio.play("soundtrack");
        settings.data.sounds = true;
      }
      return false;
    });

    if (cookie('sound') == 'off') {
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
      .bind('o','settings')
      .bind('8','2d')
      .bind('9','3d')
      .bind('0','2d+3d');

    this.game.pushState(NetworkState);

    $('.shareUrl').each(function() {
      if ($(this).is('input')) {
        $(this).val(document.location.href);
      } else {
        $(this).html(document.location.href);
      }
      $("#shareTextArea").on('click',function(e){
        //selectText();

        $(this)[0].focus();
        $(this)[0].select();

      })
    });

    $('.state').addClass('inactive');

  },


  controls: function(inputs){
    //toggle debug/settings menu
    if( inputs.pressed('settings')) {
      $("#settingsGUIContainer").toggle();
    }

    if( inputs.pressed('2d') )
      world.renderer.triggerEvent('2d')
    else if( inputs.pressed('3d') )
      world.renderer.triggerEvent('3d')
    else if( inputs.pressed('2d+3d') )
      world.renderer.triggerEvent('2d+3d')

    settings.stats.update();
  },

  destroy: function(){
    destroyState(this)
    this.game.popState();
  }

}

var NetworkState = {
  name: 'Network',

  roomName: null, // will be set from module.exports();
  remote: null,
  opponentGameState: null, // State of the opponent.

  create: function(){
    createState(this)
    var game = this.game;

    // Wait for camera to be activated.
    camera.on('userMedia', function(stream){
      this.remote.addStream(stream);
    }.bind(this));

    $.ajax({
      url: "/channeltoken/" + (new Date()).getTime(),
      type: "POST",
      data: {
        roomName: this.roomName,
        clientId: cookie("clientId")
      },
      dataType: "json",
      error: function() {
        console.error(arguments)
        alert("Out of Google Channel API quotas.");
      },
      success: function(data){
        var channelToken = data.token
          , clientId = cookie("clientId");

        this.remote = rtc.connect(channelToken, this.roomName, clientId)
        this.remote.on('promoted',function(){
          info.hostStatus(true)
          var wasHost = world.host;
          world.host = true;
          world.renderer.activePlayer(0)
          $('body').addClass('Host').removeClass('Guest');
          $('.host').show();
          $('.slave').hide();
          $("#mainmenu .playComputer")[0].disabled = false;
          $("#mainmenu .playFriend")[0].disabled = false;

        })

        this.remote.on('demoted',function(){
          info.hostStatus(false)
          world.host = false;
          world.renderer.activePlayer(1)
          $('body').removeClass('Host').addClass('Guest');
          $('.host').hide();
          $('.slave').show();
          $('.multiplayer').show();
          $("#mainmenu .playFriend")[0].disabled = false;
          $("#mainmenu .playComputer").hide();
        })

        this.remote.on('full',function(e){
          // this should come early, if ever
          $('.multiplayer, .singleplayer').hide();
          $('.singleplayer').hide();
          $('.full').show();
          $("#mainmenu .playFriend")[0].disabled = true;
        })

        this.remote.on('open',function(){
          // now we're connected to a peer over PeerConnection
          if( game.isState(InviteFriendState) || game.isState(WaitingFriendState) ){
            if( world.host )
              game.switchState(FriendArrivedState)
            else
              game.switchState(WaitingFriendState)
          }
        })

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
          world.renderer.triggerEvent('remoteVideoAvailable', {visible:false});
          document.getElementById('remoteInput').src = null;
          if( world.multiplayer ){
            world.multiplayer = false;
            while(this.game.hasState(GameStartState) && !this.game.isState(GameStartState))
              this.game.popState()
            this.game.switchState(OpponentLeftState);
          }
        }.bind(this))

        this.remote.on('state',function(newState){
          info.stateHistory('remote',newState)
          if (this.opponentGameState != newState) {
            console.log('Opponent switched to state: ' + newState);
            this.opponentGameState = newState;
            switch(this.opponentGameState){

              case 'WaitingFriend':
                game.switchState(FriendArrivedState);
                break;


              case 'FriendArrived':
                if( world.host )
                  game.switchState(WaitingFriendState);
                break;

              case 'WaitForFriendCamera':
                if( game.isState(WaitForFriendCameraState) )
                  game.switchState(TimeSyncState);
                break;

              case 'WebcamActivation':
                if( game.isState(WaitingFriendAcceptState) )
                  game.switchState(WebcamActivationState);
                break;

              case 'TimeSync':
                // TODO this is a pretty ugly hack
                while(game.hasState(GameStartState) && !game.isState(GameStartState))
                  game.popState()
                game.switchState(TimeSyncState);
                break;

              case 'GameStart':
                
                //start if I also waiting
                if( game.isState(WaitForGameStartState) )
                  game.switchState(GameStartState);
                break;

              case 'Play':
                if(this.game.isState(PauseState) ){
                  this.game.switchState(PlayState);
                } else {
                  console.warn('ignoring Play as current state is not Pause')
                }
                break;

              case 'Pause':
                if(this.game.isState(PlayState)){
                  this.game.switchState(PauseState);
                } else {
                  console.warn('ignoring Pause as current state is not Play')
                }
                break;

              case 'GameOver':
                if(this.game.isState(PlayState)) {
                  while(this.game.hasState(GameStartState) && !this.game.isState(GameStartState))
                    this.game.popState()
                  this.game.switchState(GameOverState);
                } else {
                  console.warn('ignoring GameOver as current state is not Play')
                }
                break;
            }

          }
        }.bind(this))

        // Send your state to the other player:
        this.game.on('pushState', function(newState) {
          info.stateHistory('local',newState)
          this.remote.socket.emit('state',newState);
        }.bind(this));

        // setInviteStatus(Waiting);
        game.switchState(MainMenuState)
      }.bind(this)
    });

    // When NetworkState is initialized, start the Main Menu
    this.game.pushState(LoadingState)
  },

  destroy: function(){
    destroyState(this)
    this.remote.off('promoted')
    this.remote.off('demoted')
    this.remote.off('full')
    this.remote.off('open')
    this.remote.off('close')
    this.remote.off('addstream')
    this.remote.off('removestream')
    this.remote.off('datachannel')
    this.remote.off('disconnect')
    this.remote.off('state')
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
    $('.state.Loading').remove();
    // We will never have to return to this state.
    LoadingState = null;
  }
}

var MainMenuState = {
  name: 'MainMenu',

  create: function(){
    // shortcut
    if( window.location.href.indexOf("play") != -1){
      world.renderer.activePlayer(0);
      this.game.switchState(GameStartState);

      return;
    }

    createState(this)

    $('#mainmenu .playFriend').on('click', function(){

      switch(NetworkState.opponentGameState){
        case 'InviteFriend':
        case 'FriendArrived': // i am guest
          this.game.switchState(WaitingFriendAcceptState);
          break;
        case 'WaitingFriend': // i am host
          this.game.switchState(FriendArrivedState)
          break;
        case 'WaitingFriendAccept': // i am host
          this.game.switchState(WebcamActivationState)
          break;
        default: // not yet connected (or connected friend is not waiting)
          if( world.host ) this.game.switchState(InviteFriendState)
          else {  
            this.game.switchState(WaitingFriendAcceptState)
          }
      }
    }.bind(this));

    $('#mainmenu .playComputer').on('click', function() {
      this.game.switchState(GameInstructionsState);
    }.bind(this));

    world.renderer.changeView("lobby");

    this.game.inputs
      .bind('space', 'next');

  },

  controls: function(inputs) {
    if (inputs.pressed('next')) {
      $('#mainmenu .playComputer').click()
    }
  },


  destroy: function(){
    destroyState(this)
    this.nextState = null;
    this.game.inputs.unbind('space');
    $('#mainmenu .playFriend, #mainmenu .playComputer').off('click');
    clearTimeout(this.timeout)

    window.removeEventListener('resize', this.onresize);
  },

  render: function( alpha ){
    world.renderer.render(world, alpha)
  }

}

var InviteFriendState = {
  name: 'InviteFriend',
  create: function(){
    createState(this)
    $('.InviteFriend .backFromInvite').on('click',function(){
      
      this.game.switchState(MainMenuState);
    }.bind(this))
    this.game.inputs.bind('space', 'back');
  },
  controls: function(inputs) {
    if (inputs.pressed('back')) {
      $('.InviteFriend .backFromInvite').click();
    }
  },
  render: function(alpha){
    world.renderer.render(world, alpha)
  },
  destroy: function(){
    destroyState(this)
    this.game.inputs.unbind('space');
    $('.InviteFriend .backFromInvite').off('click');
  }
}

var WaitingFriendAcceptState = {
  name: 'WaitingFriendAccept',
  create: function(){
    createState(this)
    $('.WaitingFriendAccept .backToMainMenu').on('click',function(){
      this.game.switchState(MainMenuState);
    }.bind(this))
    this.game.inputs.bind('space', 'back');
  },
  controls: function(inputs) {
    if (inputs.pressed('back')) {
      $('.WaitingFriendAccept .backToMainMenu').click();
    }
  },
  render: function(alpha){
    world.renderer.render(world, alpha)
  },
  destroy: function(){
    destroyState(this)
    this.game.inputs.unbind('space');
    $('.WaitingFriendAccept .backToMainMenu').off('click');
  }
}

var FriendArrivedState = {
  name: 'FriendArrived',
  create: function(){
    createState(this)
    this.game.inputs.bind('space', 'accept');
    $('#playFriend').on('click',function(){
      if( world.webcam ){
        this.game.switchState(WaitForFriendCameraState);
      } else {
        this.game.switchState(WebcamActivationState);
      }
    }.bind(this))

  },
  controls: function(inputs) {
    if (inputs.pressed('accept')) {
      $('#playFriend').click();
    }
  },
  render: function(alpha){
    world.renderer.render(world, alpha)
  },
  destroy: function(){
    destroyState(this)
    this.game.inputs.unbind('space');
    $('#playFriend').off('click');
  }
}

var WaitingFriendState = {
  name: 'WaitingFriend',
  create: function(){
    createState(this)
    this.game.inputs.bind('space', 'accept');
    $('#playWaitingFriend').on('click',function(){
      if( world.webcam ){
        this.game.switchState(WaitForFriendCameraState);
      } else {
        this.game.switchState(WebcamActivationState);
      }
    }.bind(this))

  },
  controls: function(inputs) {
    if (inputs.pressed('accept')) {
      $('#playWaitingFriend').click();
    }
  },
  render: function(alpha){
    world.renderer.render(world, alpha)
  },
  destroy: function(){
    destroyState(this)
    this.game.inputs.unbind('space');
    $('#playWaitingFriend').off('click');
  }
}

var WebcamActivationState = {
  name: 'WebcamActivation',
  nextState: null, // If null, WebcamActivationState will go to WaitForFriendCameraState's nextState on webcam errors.
  create: function() {
    createState(this)
    world.renderer.changeView("webcamActivation", function(){
      camera.start();
    });

    camera.on('userMedia', this.cameraOn);
    camera.on('userMediaError', this.cameraOff);
  },

  cameraOn: function( stream ) {
    world.webcam = true;

    var videoInput = document.getElementById('videoInput');
    videoInput.width = 320
    videoInput.height = 240
    videoInput.autoplay = true
    videoInput.src = window.webkitURL ? window.webkitURL.createObjectURL(stream) : stream

    world.renderer.triggerEvent('localVideoAvailable');
    WebcamActivationState.game.switchState(this.nextState || WaitForFriendCameraState);
  },

  cameraOff: function() {
    world.webcam = false;
    camera.hide();
    WebcamInformationState.nextState = this.nextState;
    WebcamActivationState.game.switchState(WebcamInformationState);
    var videoInput = document.getElementById('videoInput');
    videoInput.src = null;
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
      if (NetworkState.game.hasState(GameStartState)) {
        NetworkState.game.switchState(this.nextState || PlayState);
      } else {
        NetworkState.game.switchState(this.nextState || GameInstructionsState);
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

var WaitForFriendCameraState = {
  name: 'WaitForFriendCamera',
  create: function(){
    createState(this)
  },
  render: function(alpha){
    world.renderer.render(world, alpha)
  },
  destroy: function(){
    destroyState(this)
  }
}

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

      if(NetworkState.opponentGameState == "WaitForGameStart"){
          return this.game.switchState(GameStartState);
       }
       else {
          this.game.switchState(WaitForGameStartState);
       }

    }

    // Use time-sync to sync the time between the peers
    // before going to the PlayState
    var dc = NetworkState.remote.connection.createDataChannel(NetworkState.roomName);
    TimeSync(dc)
      .on('timeout',function(){
        console.error('time sync timed out')
      })
      .on('done',function(host){
        console.log('time sync (was host? %s), latency:',host,this.latency)
        world.multiplayer = true;
        GameStartState.channel = dc;
        TimeSyncState.latency = this.latency;
        TimeSyncState.game.switchState(GameInstructionsState);
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

var GameInstructionsState = {
  name: "GameInstructions",

  create: function() {
    createState(this)

    world.renderer.changeView("play");

    var gameInstructions = $('.state.GameInstructions').removeClass('inactive');
    gameInstructions.find(".play").show().bind('click', function() {
      //gameInstructions.find(".play").hide();
      
      if( GameStartState.channel ) {
         if(NetworkState.opponentGameState == "WaitForGameStart"){
            this.game.switchState(GameStartState);
         }
         else {
            this.game.switchState(WaitForGameStartState);
         }
      }
      else {
        this.game.switchState(GameStartState);  
      }

      
    }.bind(this));

    this.game.inputs
      .bind('space', 'next');

  },

  controls: function(inputs) {
    if (inputs.pressed('next')) {
      this.game.switchState(GameStartState);
    }
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    destroyState(this)

  }
}

var GameStartState = {
  name: "GameStart",

  puppeteer: null,
  simulator: null,
  channel: null,    // should be set by TimeSync

  // the level up/game over logic in singleplayer
  singleplayer: function(world,level){
    // level up if player b has more than maxHits
    if( world.players.b.hits.length >= level.maxHits ) {
      return this.up()
    }


    // game over if player a has more than maxHits
    if( world.players.a.hits.length >= level.maxHits )
      world.over = true;

    // emit game over if it happened
    if( world.over ){
      // who won?
      // TODO is this really the right place for this logic?
      world.winner = world.players.a.hits.length > world.players.b.hits.length
        ? world.players.b
        : world.players.a;

      this.over();
    }
  },


  // the level up/game over logic in multiplayer
  multiplayer: function(world,level){
    // game over it any player has more than maxHits
    if( world.players.a.hits.length >= level.maxHits )
      world.over = true;

    if( world.players.b.hits.length >= level.maxHits )
      world.over = true;

    // emit game over if it happened
    if( world.over ){
      // who won?
      // TODO is this really the right place for this logic?
      world.winner = world.players.a.hits.length > world.players.b.hits.length
        ? world.players.b
        : world.players.a;


      this.over();
    }
  },

  create: function() {
    createState(this)

    var game = this.game
      , self = this;

    // the puppeteer takes care of the levels
    this.puppeteer = new Puppeteer()
    var editor = this.editor = new Editor(this.puppeteer)
    this.puppeteer.on('added',function(level){
      // adds the level to the level editor
      editor.add(level)
    })
    this.puppeteer.on('change',function(level){
      // keep a reference to the current level in world
      // (it's just easier in actions.js this way)
      world.level = this.levels[level]
      settings.changeTheme(world.level.theme)

      $("#level").html(level+1);

      //world.level = level+1;

      // restart game
      if( self.simulator ){
        if( game.isState(PlayState) )
          game.popState()

        if( game.isState(self.simulator) )
          game.popState() // simulator

        game
          .pushState(self.simulator)
          .pushState(PlayState)
      }
    })
    if( world.multiplayer )
      this.puppeteer.on('update',this.multiplayer)
    else
      this.puppeteer.on('update',this.singleplayer)
    this.puppeteer.on('game over',function(level){

        //set score
       $("#highscoreLevels").html( self.puppeteer.level+1 )

      world.renderer.triggerEvent("gameOver");

      game
        .popState() // play
        .popState() // simulator
        .switchState(GameOverState); // GameStart -> GameOver
    })
    this.puppeteer.add(require('./levels/level1'));
    this.puppeteer.add(require('./levels/level2'));
    this.puppeteer.add(require('./levels/level3'));
    this.puppeteer.add(require('./levels/level4'));
    this.puppeteer.add(require('./levels/level5'));
    this.puppeteer.add(require('./levels/level6'));
    this.puppeteer.add(require('./levels/level7'));
    this.puppeteer.add(require('./levels/level8'));
    this.puppeteer.goto(0)

    // create the simulater _after_ the
    // puppeteer to make sure it gets the first
    // frames
    this.simulator = new Simulator();
    this.simulator.channel = this.channel;
    this.game.pushState(this.simulator)
    this.game.pushState(PlayState);

    //debug shortcut
    var levelIndex = window.location.href.indexOf("level=");
    if( levelIndex != -1){
      var level = parseInt(window.location.href.charAt(levelIndex+6));
      this.puppeteer.goto(level-1)
    }
  },

  update: function(){
    this.puppeteer.update(world)
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    destroyState(this)
    this.puppeteer = null
    this.simulator = null
    if( this.channel ){
      this.channel.close()
      this.channel = null
    }
    if( this.editor ){
      this.editor.destroy()
      this.editor = null
    }
  }
}


var PlayState = {
  name: 'Play',

  create: function(){
    createState(this)

    // make sure we get here the right way
    if( !GameStartState.simulator )
      throw new Error('no simulator in GameStartState');

    // just in case we're not already here...
    world.renderer.changeView("play");

    // only in multiplayer should we have a channel
    // only in singleplayer should we have an AI
    if( !world.multiplayer ){
      this.ai = new AI();
      $("#scoresSingleplayer").show();
      $("#scoresMultiplayer").hide();
    }
    else {
      world.renderer.swapToVideoTexture();
      $("#scoresMultiplayer").show();
      $("#scoresSingleplayer").hide();
    }

    var el = $('.countdown'),  
        newone = el.clone(true);
     
    el.before(newone);
  
    $("." + el.attr("class") + ":last").remove();

    var countdown = function(nr) {
      if (nr > 0) {
        //element.removeClass("active").addClass("active");
        //element.css({backgroundPosition:"0px " + (-220*(nr-1)) + "px"});

        this.timeout = setTimeout(function(){countdown(nr - 1)}, 1000);
      } else {

        $('.state.Play').removeClass('active').addClass('inactive')
        $("#gameScores").removeClass('inactive').addClass('active')
        world.host && GameStartState.simulator.resume()
        this.game.inputs
          .bind('esc', 'pause')
          .bind('space', 'pause');
      }
    }.bind(this)

    // wait until we're in play view
    var offset = TimeSyncState.latency || 0;
    this.timeout = setTimeout(function(){
      console.log('starting countdown')
      countdown(3)
    }, 0 - offset);
  },

  controls: function(inputs) {
    if( world.paused ) return;
    if( this.ai && this.ai.update(world) ){
      inputs.ai = this.ai.position;
    }
    if (this.game.isState(this) && inputs.pressed('pause')) {
      this.game.switchState(PauseState);
    }
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function(){
    destroyState(this)
    clearTimeout(this.timeout)
    this.game.inputs
      .unbind('space')
      .unbind('esc')
    this.ai = null

    world.host && GameStartState.simulator.pause()
  }

}


var PauseState = {
  name: 'Pause',

  create: function() {
    createState(this)

    $('.state.Pause .play').each(function() {
      $(this).bind('click', function() {
        PauseState.game.switchState(PlayState);
      });
    });

    this.timeout = setTimeout(function(){
      this.game.inputs
        .bind('space', 'resume');
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
    this.game.inputs.unbind('space');
    $('.state.Pause .paddleSetup').unbind('click');
    $('.state.Pause .play').unbind('click');
  }

}




var OpponentLeftState = {
  name: 'OpponentLeft',
  create: function() {
    createState(this)

    world.renderer.triggerEvent('friendLeft');

    $('.state.OpponentLeft .play').each(function() {
      $(this).bind('click', function() {
        OpponentLeftState.game.switchState(GameStartState);
      });
    });

    this.timeout = setTimeout(function(){
      this.game.inputs
        .bind('space', 'restart');
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
    this.game.inputs.unbind('space');
    $('.paddleSetup').unbind('click');
    $('.state.OpponentLeft .play').each(function() {
      $(this).unbind('click');
    });
  }
}


var WaitForGameStartState = {
  name: 'WaitForGameStart',

  create: function() {
    createState(this)
    world.renderer.changeView("play");
  },


  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    destroyState(this)
  }

}

var GameOverState = {
  name: 'GameOver',
  create: function() {

    $('#gameOverDialog .play').on('click', function() {
      this.restart();
      return false;
    }.bind(this));


    $('#gameOverDialog .playFriend').on('click', function(){
      switch(NetworkState.opponentGameState){
        case 'InviteFriend':
        case 'FriendArrived': // i am guest
          this.game.switchState(WaitingFriendState)
          break;
        case 'WaitingFriend': // i am host
          this.game.switchState(FriendArrivedState)
          break;
        default: // not yet connected (or connected friend is not waiting)
          this.game.switchState(InviteFriendState)
      }
    }.bind(this));


    if( world.multiplayer) {
      //$("#highscoreLevels").html( world.level )
      //$("#highscoreRally").html( world.maxAlive )
      $("#scoreboardMulti").show();
      $("#scoreboardSingle").hide();
    }
    else {
     //level is set in GameStartState when game over
      $("#highscoreRally").html( world.maxAlive )
      $("#scoreboardMulti").hide();
      $("#scoreboardSingle").show();
    }


    // wait to show so the bear can cheer
    this.timeout = setTimeout(function(){
      createState(this)
      this.game.inputs
        .bind('space', 'restart');

      world.renderer.changeView("lobby");

    }.bind(this),3000)
  },

  controls: function(inputs) {
    if (inputs.pressed('restart')) {
      this.restart();
    }
  },

  restart: function() {
    if( !world.multiplayer )
      return this.game.switchState(GameStartState);

    switch(NetworkState.opponentGameState){
      // other player is ready, lets go!
      case 'WaitForGameStart':
        this.game.switchState(TimeSyncState);
        break;

      // other player is not ready, just mark me as ready
      default:
        this.game.switchState(WaitForGameStartState);
    }
  },

  render: function(alpha){
    world.renderer.render(world, alpha)
  },

  destroy: function() {
    destroyState(this)
    clearTimeout(this.timeout)
    this.game.inputs.unbind('space');
    $('.paddleSetup').off('click');
    $('#gameOverDialog .play').off('click');
  }

}


module.exports = function(options){
  RootState.acceptLanguage = options.acceptLanguage;
  NetworkState.roomName = options.room;
  new Game()
    .pushState(RootState)
    .run()
}
