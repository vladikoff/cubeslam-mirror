var settings = require('../settings')
  , Body = require('../geom-sim/body')
  , shapes = require('../geom-sim/shapes')
  , Editor = require('../level-editor')
  , see = require('../support/see')
  , mouse = require('../support/mouse')
  , lock = require('../support/pointer-lock')
  , keys = require('mousetrap')
  , World = require('../world')
  , buffer = require('../support/buffer')
  , AI = require('../ai')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , $ = require('jquery');

exports.Setup = {
  enter: function(ctx){

    setupLevels(ctx,ctx.game)
    createEditor(ctx)

    startGame(ctx.game,true)

    // multiplayer simulation (no renderer)
    console.log('game setup w. multiplayer?',ctx.multiplayer)
    if( ctx.multiplayer ){
      setupLevels(ctx,ctx.networkGame)
      startGame(ctx.networkGame,false)
      networkInput(ctx);

      // compare ctx.game.world and ctx.networkGame.world
      keys.bind('c',function(){
        var diff = ctx.game.actions.debugDiff();
        ctx.networkGame.actions.debugDiff(diff);
      })

    } else {
      ctx.networkGame = null;
      // TODO
      // ctx.game.off('input')
      // ctx.game.off('update')
      // network.off('message')
    }

    var game = ctx.game
      , isLeft = 0
      , isRight = 0;

    this.update = function(world,timestep){
      if( world.paused ) return;
      isLeft  && game.emit('input',World.MOVE,-settings.data.keyboardSensitivity*10);
      isRight && game.emit('input',World.MOVE,+settings.data.keyboardSensitivity*10);
      mouse.tick() // will emit 'move' or 'click'
    }
    game.on('update',this.update)

    // prefer pointer lock
   /* if( lock.available ){
      console.log('pointer-lock available!')

      // TODO if pointer lock is available we should make people
      //      click the scene somehow to enable it (when required)

      var pointer = lock(document.getElementById('game'))
      pointer.on('move',function(dx,dy){
        game.emit('input',World.MOVE,dx * settings.data.mouseSensitivity)
      })
      // fallback to mouse move in case
      // it's denied
      pointer.on('error',function(){
        mouse.on('move',function(dx,dy,dt){
          game.emit('input',World.MOVE,dx * settings.data.mouseSensitivity)
        })
      })
    } else {*/
      console.log('pointer-lock not available, using mouse move')
      mouse.on('move',function(dx,dy,dt){
        game.emit('input',World.MOVE,dx * settings.data.mouseSensitivity)
      })
    //}


    keys.bind(['left','a'],function(){ isLeft = 1; },'keydown')
    keys.bind(['left','a'],function(){ isLeft = 0; },'keyup')
    keys.bind(['right','d'],function(){ isRight = 1; },'keydown')
    keys.bind(['right','d'],function(){ isRight = 0; },'keyup')
    keys.bind(['up','w'],function(){ game.emit('input',World.SHOOT) })
    mouse.on('click',function(x,y,dt){ game.emit('input',World.SHOOT); })
    mouse.start()
  },

  leave: function(ctx){
    ctx.game.off('update',this.update)
    keys.unbind('right','keyup')
    keys.unbind('right','keydown')
    keys.unbind('left','keyup')
    keys.unbind('left','keydown')
    keys.unbind('up')
    mouse.off('click')
    mouse.off('move')
    mouse.stop()

    ctx.puppeteer.off('update')
    ctx.puppeteer.off('game over')
    ctx.puppeteer.off('added')
    ctx.puppeteer.off('change')
    ctx.puppeteer = null
    ctx.editor = null

  }
}


exports.Information = {
  enter: function(ctx){
    ctx.game.actions.gameResume() // allow for controls
    ctx.renderer.changeView("play");

    var info = $('.state.game-info');
    this.play = info.find(".play").show()
    this.play.on('click',function(){ see('/game/start') });
    keys.bind('space', function(){ see('/game/start') });
  },

  leave: function(ctx){
    this.play.off('click');
    keys.unbind('space');
  }
}


exports.Waiting = {
  enter: function(ctx){},
  leave: function(ctx){}
}

exports.Start = {

  enter: function(ctx){
    var world = ctx.game.world;

    startGame(ctx.game,true)
    if( ctx.multiplayer )
      startGame(ctx.networkGame,false);

    // show scores
    $("#scores .singleplayer").toggle(!ctx.multiplayer);
    $("#scores .multiplayer").toggle(ctx.multiplayer);

    // AI
    // singleplayer
    if( !ctx.multiplayer ){
      ctx.ai = new AI(world.opponent.paddle);
      ctx.game.on('update',ctx.ai.update.bind(ctx.ai))

    // multiplayer
    } else {
      // debug multiplayer AI
      if( ~window.location.href.indexOf('ai') ){
        ctx.ai = new AI(world.me.paddle);
        ctx.game.on('update',ctx.ai.update.bind(ctx.ai))
      }
      ctx.renderer.swapToVideoTexture();
    }

    see('/game/play')
  },

  leave: function(ctx){
    // TODO ctx.game.off('update',puppeteer.update)
    // TODO ctx.game.off('update',ai.update)

  }

}

exports.Play = {
  enter: function(ctx){
    // just in case we're not already here...
    ctx.renderer.changeView("play");

    var countdown = function(nr) {
      if (nr > 0) {
        this.timeout = setTimeout(countdown, 1000, nr-1);
        $('.countdown-number').eq(nr-1).addClass('visible')
          .siblings().removeClass('visible');
      } else {
        $('.countdown-number.visible').removeClass('visible');
        $("#gameScores").removeClass('inactive').addClass('active')
        keys.bind(['esc','space'], function(){ see('/game/pause') })
        ctx.game.emit('input',World.PLAY)
      }
    }.bind(this)

    // wait until we're in play view
    var offset = ctx.latency || 0;
    this.timeout = setTimeout(function(){
      console.log('starting countdown')
      countdown(3)
    }, 1000 - offset);
  },


  leave: function(ctx){
    clearTimeout(this.timeout);
    keys.unbind('esc')
    keys.unbind('space')
    ctx.game.emit('input',World.PAUSE)
  }
}


exports.Pause = {
  enter: function(ctx){
    $('.play-friend',ctx.el)
      .toggle(!ctx.multiplayer) // hidden if we already play in multiplayer
      .on('click',function(){ see('/friend/invite') })

    // TODO listen if the other player resumes the game
    //      when in multiplayer

    $('.play',ctx.el)
      .on('click',function(){ see('/game/play') })

    keys.bind('space', function(){ see('/game/play') })
  },
  leave: function(ctx){
    keys.unbind('space')
    $('.play-friend',ctx.el).off('click');
    $('.play',ctx.el).off('click');
  }
}


exports.Over = {
  enter: function(ctx){
    $("#scoreboardMulti").toggle(ctx.multiplayer)
    $("#scoreboardSingle").toggle(!ctx.multiplayer)
    $("#highscoreRally").html( ctx.game.world.maxAlive )

    $('.play-friend',ctx.el)
      .attr('disabled',!ctx.multiplayer)
      .on('click',function(){ see('/friend/invite') })

    function restart(){
      if(!ctx.multiplayer){
        see('/game/start')
      } else {
        // TODO check ctx.network.pathname
        console.error('multiplayer restart not implemented')
      }
      return false;
    }

    keys.bind('space',restart)
    $('#game-over .play').on('click',restart)

    ctx.renderer.triggerEvent("gameOver");
    ctx.renderer.changeView("gameOver");
  },

  leave: function(ctx){
    keys.unbind('space')
    $('#game-over .play').off('click')
  }
}

function createEditor(ctx){
  ctx.editor = new Editor(ctx.game)
  // add the level to the level editor
  ctx.game.puppeteer.on('added',ctx.editor.add.bind(ctx.editor));
}

function startGame(game,local){
  var world = game.world;

  // reset the game
  game.reset();

  // create paddles
  world.players.a.paddle = game.actions.createPaddle(0, .5, 1-1/settings.data.arenaRows);
  world.players.b.paddle = game.actions.createPaddle(1, .5, 1/settings.data.arenaRows);

  // easy player access
  world.me = local ? world.players.a : world.players.b;
  world.opponent = local ? world.players.b : world.players.a;

  // create puck
  createPuck(game.world,game.actions)
}

function setupLevels(ctx,game){
  game.puppeteer.on('change',function(level){
    // keep a reference to the current level in world
    // (it's just easier in the actions this way)
    game.world.level = this.levels[level]
    settings.changeTheme(game.world.level.theme)

    $("#level").html(level+1);

    // restart game
    if( ctx.pathname == '/game/play' )
      see('/game/start')
  })

  // check if game is over multiplayer or singleplayer (defined below)
  game.puppeteer.on('update', ctx.multiplayer ? multiplayer : singleplayer)
  game.puppeteer.on('game over',function(level){
    $("#highscoreLevels").html(level+1)
    see('/game/over')
  })

  // debug shortcut
  var RE_DBG_LEVEL = /[&?]level=(\d+)/g;
  if( RE_DBG_LEVEL.exec(window.location.href) ){
    var level = parseInt(RegExp.$1)-1;
    console.log('DEBUG LEVEL',level)
     game.puppeteer.goto(level)
  } else {
     game.puppeteer.goto(0)
  }
}


function createPuck(world,actions){
  // add to center of arena
  var id = 'p:' + world.puckIndex++
    , x = settings.data.arenaWidth/2
    , y = settings.data.arenaHeight/2
    , mass = 5;
  actions.puckCreate(id,x,y,mass);

  // start it off with a push
  // TODO change the initial direction depending on who lost?
  actions.puckSpeedXY(id, 0, world.level.speed)
}

function createBullet(world,actions){
  // generate an id, x, y and v
  var id = 'b:' + world.me.paddle + ':' + world.bulletIndex++
    , c = world.paddles.get(world.me.paddle).current
    , v = world.me.paddle == 0 ? 30 : -30
    , columsWidth = settings.data.arenaWidth/settings.data.arenaColumns
    , x = Math.floor(c[0]/columsWidth)*columsWidth + columsWidth*.5;
  actions.bulletCreate(id,x,c[1]-v*10,v);
}


// the level up/game over logic in singleplayer
function singleplayer(world,level){
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
}

// the level up/game over logic in multiplayer
function multiplayer(world,level){
  // game over it any player has more than maxHits
  //if( world.players.a.hits.length >= level.maxHits )
  if( world.players.a.hits.length >= 9 )
    world.over = true;

  //if( world.players.b.hits.length >= level.maxHits )
  if( world.players.b.hits.length >= 9 )
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
}



var BUFFER_SIZES = {};
BUFFER_SIZES[World.MOVE] = 5;
BUFFER_SIZES[World.SHOOT] = 1;
BUFFER_SIZES[World.PAUSE] = 1;
BUFFER_SIZES[World.PLAY] = 1;
BUFFER_SIZES[World.OVER] = 1;

function networkInput(ctx){
  var network = ctx.network
    , remoteInputs = []
    , inputBuffer = []
    , inputLength = 0
    , queue = []; // [frame,type,args...,frame,type,args...]

  // recording input to send
  ctx.game.on('input',function(type,x){
    // also add it to a queue for
    // being included in the local networkGame
    // when it hits the correct frame
    queue.push(this.world.frame)

    inputLength += BUFFER_SIZES[type];
    switch(type){
      case World.MOVE:
        inputBuffer.push(type,x);
        queue.push(type,x)
        break;
      case World.SHOOT:
      case World.PAUSE:
      case World.PLAY:
      case World.OVER:
        inputBuffer.push(type);
        queue.push(type)
        break;
      default:
        console.error('invalid input')
    }
  })

  // sending input
  ctx.game.on('update',function(world){
    if( !inputLength )
      return;
    var buf = new ArrayBuffer(2+inputLength);
    var data = new buffer.Writer(buf);
    data.setUint16(world.frame);
    for (var i = 0; i < inputBuffer.length;) {
      var type = inputBuffer[i++];
      data.setInt8(type);
      switch(type){
        case World.MOVE:
          data.setFloat32(inputBuffer[i++]);
          break;
        case World.SHOOT:
        case World.PAUSE:
        case World.PLAY:
        case World.OVER:
          // no arguments
          break;
        default:
          console.log('unknown type',type)
          return null;
      }
    }
    network.send(buf);
    inputBuffer.length = 0;
    inputLength = 0;
  })

  // prebuild an ACK packet
  var ack = new ArrayBuffer(3);
  var data = new buffer.Writer(ack);
  data.setUint16(0); // empty frame
  data.setInt8(World.ACK);

  // receiving input
  network.on('message',function(buf){
    var data = new buffer.Reader(buf);
    var frame = data.getUint16()

    // update the networkGame until it's
    // `world.frame == frame`
    var f = ctx.networkGame.world.frame;
    while( ctx.networkGame.world.frame < frame ){
      console.log('updating network game %s > %s',ctx.networkGame.world.frame,frame)
      ctx.networkGame.update();

      // check if there's any queued local inputs to
      // be applied.
      while( queue[0] === ctx.networkGame.world.frame ){
        var qframe = queue.shift()
          , qtype = queue.shift();
        switch(qtype){
          case World.MOVE:
            var x = queue.shift();
            ctx.networkGame.emit('input',type,x)
            break;
          case World.SHOOT:
          case World.PAUSE:
          case World.PLAY:
          case World.OVER:
            ctx.networkGame.emit('input',type)
            break;
          default:
            console.error('unknown type in queue',type,new Uint8Array(buf))
        }
      }

      // it's still standing still (it's paused)
      // break to avoid a never ending loop
      if( ctx.networkGame.world.frame === f ){
        break;
      }
    }

    while(data.offset < buf.byteLength){
      var type = data.getInt8();
      switch(type){
        case World.ACK:
          console.log('%s ack',frame)
          return true; // don't send an ACK on an ACK
        case World.MOVE:
          var x = data.getFloat32();
          console.log('%s network move',frame,x)
          ctx.networkGame.emit('input',type,x)
          break;
        case World.SHOOT:
          console.log('%s network shoot',frame)
          ctx.networkGame.emit('input',type)
          break;
        case World.PAUSE:
          console.log('%s network pause',frame)
          ctx.networkGame.emit('input',type)
          break;
        case World.PLAY:
          console.log('%s network play',frame)
          ctx.networkGame.emit('input',type)
          break;
        case World.OVER:
          console.log('%s network over',frame)
          ctx.networkGame.emit('input',type)
          break;
        default:
          console.error('invalid network input')
          return false;
      }
    }

    // respond with an ACK to avoid the
    // message buffer to grow too large
    network.send(ack)
  })

}