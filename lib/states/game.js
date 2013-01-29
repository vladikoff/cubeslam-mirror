var settings = require('../settings')
  , shapes = require('../geom-sim/shapes')
  , Editor = require('../level-editor')
  , see = require('../support/see')
  , mouse = require('../support/mouse')
  , lock = require('../support/pointer-lock')
  , keys = require('mousetrap')
  , World = require('../world')
  , buffer = require('../support/buffer')
  , Inputs = require('../inputs')
  , actions = require('../actions')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , $ = require('jquery');

exports.Setup = {
  enter: function(ctx){

    // ctx.editor = new Editor(ctx.game)
    // ctx.game.puppeteer.on('added',ctx.editor.add.bind(ctx.editor));

    // setupLevels(ctx,ctx.game)
    // setupLevels(ctx,ctx.networkGame)

    // if( ctx.multiplayer )
    networkInput(ctx);
    this.disconnected = function(){
      // TODO store input history
      // and have some kind of "don't leave this page
      // and get your friend to reconnect on this url"
      // message and when friend reconnects send the
      // history, let the game resync /game/resync (web worker?)
      // and then go to /game/wait. when both peers are at
      // /game/wait go to /game/start and let the game begin
      see('/friend/left')
    }
    ctx.network.on('disconnected',this.disconnected)

    var game = ctx.game
      , world = game.world
      , isLeft = 0
      , isRight = 0;

    this.update = function(world,timestep){
      if( world.paused ) return;
      isLeft  && game.emit('input',World.MOVE,world.me.paddle,-settings.data.keyboardSensitivity*10);
      isRight && game.emit('input',World.MOVE,world.me.paddle,+settings.data.keyboardSensitivity*10);
      mouse.tick() // will emit 'move' or 'click'
    }
    game.on('pre update',this.update)

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
        game.emit('input',World.MOVE,world.me.paddle,dx * settings.data.mouseSensitivity)
      })
    //}


    keys.bind(['left','a'],function(){ isLeft = 1; },'keydown')
    keys.bind(['left','a'],function(){ isLeft = 0; },'keyup')
    keys.bind(['right','d'],function(){ isRight = 1; },'keydown')
    keys.bind(['right','d'],function(){ isRight = 0; },'keyup')
    keys.bind(['up','w'],function(){ game.emit('input',World.SHOOT,world.me.paddle) })
    mouse.on('click',function(x,y,dt){ game.emit('input',World.SHOOT,world.me.paddle); })
    mouse.start(document.getElementById('game'))
  },

  leave: function(ctx){
    ctx.network.off('disconnected',this.disconnected)
    ctx.game.off('update',this.update)
    keys.unbind('right','keyup')
    keys.unbind('right','keydown')
    keys.unbind('left','keyup')
    keys.unbind('left','keydown')
    keys.unbind('up')
    mouse.off('click')
    mouse.off('move')
    mouse.stop()
  }
}


exports.Information = {
  enter: function(ctx){
    startGame(ctx.game,!ctx.network.winner)
    startGame(ctx.networkGame,ctx.network.winner)

    ctx.game.emit('input',World.PLAY)
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
    startGame(ctx.game,!ctx.network.winner)
    startGame(ctx.networkGame,ctx.network.winner)

    // show scores
    $("#scoresSingleplayer").toggle(!ctx.multiplayer);
    $("#scoresMultiplayer").toggle(ctx.multiplayer);

    // AI
    // singleplayer
    if( !ctx.multiplayer ){
      ctx.game.ai.setTarget(ctx.game.world.opponent.paddle);
      ctx.networkGame.ai.setTarget(ctx.networkGame.world.opponent.paddle);

    // multiplayer
    } else {
      // debug multiplayer AI
      if( ~window.location.href.indexOf('ai') )
        ctx.game.ai.setTarget(ctx.networkGame.world.me.paddle);
      ctx.renderer.swapToVideoTexture();
    }

    // TODO go to /game/level > /game/round > /game/play

    see('/game/play')
  },

  leave: function(ctx){
  }

}

exports.Play = {
  enter: function(ctx){
    console.log("GAME PLAY ENTER")

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
    console.log("GAME PLAY LEAVE")
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
    $("#scoresSingleplayer").hide();
    $("#scoresMultiplayer").hide();
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
    $('#gameOverDialog .play').on('click',restart)

    ctx.renderer.triggerEvent("gameOver");
    ctx.renderer.changeView("gameOver");
  },

  leave: function(ctx){
    keys.unbind('space')
    $('#gameOverDialog .play').off('click')
  }
}


function startGame(game,local){
  var world = game.world;

  // reset the game
  game.reset();

  // easy player access
  world.me = local ? world.players.a : world.players.b;
  world.opponent = local ? world.players.b : world.players.a;

  // create paddles
  world.players.a.paddle = actions.createPaddle(world,.5, 1-1/settings.data.arenaRows);
  world.players.b.paddle = actions.createPaddle(world,.5, 1/settings.data.arenaRows);

  // create shields
  for(var i=0,l=world.players.a.shields.length; i<l; i++)
    actions.createShield(world,world.players.a,i,l);

  for(var i=0,l=world.players.b.shields.length; i<l; i++)
    actions.createShield(world,world.players.b,i,l);

  // create puck
  actions.puckCreateCenter(world)
}

function setupLevels(ctx,game){
  game.puppeteer.on('change',function(level){
    // keep a reference to the current level in world
    // (it's just easier in the actions this way)
    game.world.level = this.levels[level]
    game.world.levelIndex = level;
    settings.changeTheme(game.world.level.theme)

    $("#level").html(level+1);

    // restart game
    if( !game.replaying && ctx.pathname == '/game/play' )
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


function networkInput(ctx){
  var network = ctx.network;

  keys.bind('f',function(){
    forward(ctx.networkGame,ctx.game.world.frame)
  })

  keys.bind('i',function(){
    network.remote.signal.send({
      type:'inputhash',
      hashcode: ctx.networkGame.inputs.hashCode()
    })
  })
  network.remote.on('inputhash',function(e){
    console.log('inputhash')
    console.log(' remote:',e.hashcode)
    console.log('  local:',ctx.networkGame.inputs.hashCode())
    // if( e.hashcode !== ctx.networkGame.world.hashCode() )
    //   throw new Error('out of sync :(')
    // TODO pause/warn and run a full replay
  })

  keys.bind('h',function(){
    network.remote.signal.send({
      type:'hashcode',
      hashcode: ctx.networkGame.world.hashCode()
    })
  })
  network.remote.on('hashcode',function(e){
    console.log('hashcode')
    console.log(' remote:',e.hashcode)
    console.log('  local:',ctx.networkGame.world.hashCode())
    // if( e.hashcode !== ctx.networkGame.world.hashCode() )
    //   throw new Error('out of sync :(')
    // TODO pause/warn and run a full replay
  })

  // a test which should restart from the beginning
  // (it shouldn't really be noticed)
  keys.bind('r',function(){
    replay()
  })

  if( !network.winner ){
    setInterval(function(){
      // test to run some input
      ctx.game.emit('input',World.MOVE,ctx.game.world.me.paddle,1)
    },200)
  } else {
    setInterval(function(){
      // test to run some input
      ctx.game.emit('input',World.MOVE,ctx.game.world.me.paddle,-2)
    },500)
  }

  setInterval(replay,1000)

  keys.bind(',',function(){
    var diff = actions.debugDiff(ctx.game.world);
    console.log(diff)
  })

  keys.bind('c',function(){
    var diff = actions.debugDiff(ctx.networkGame.world);
    network.remote.signal.send({type:'diff',diff: diff})
  })

  network.remote.on('diff',function(e){
    actions.debugDiff(ctx.networkGame.world,e.diff)
  })

  // sending input
  ctx.game.on('apply',function(world,inputs,size){
    if( !size ) return;
    var buf = new ArrayBuffer(2+size);
    var data = new buffer.Writer(buf);
    data.setUint16(world.frame);
    for(var i=0; i < inputs.length;) {
      var type = inputs[i++];
      data.setInt8(type);
      switch(type){
        case World.MOVE:
          var p = inputs[i++];
          var x = inputs[i++];
          data.setUint8(p);
          data.setFloat32(x);
          localQueue.push(world.frame,type,p,x)
          break;
        case World.SHOOT:
          var p = inputs[i++];
          data.setUint8(p);
          localQueue.push(world.frame,type,p)
          break;
        case World.PAUSE:
        case World.PLAY:
        case World.OVER:
          // no arguments
          localQueue.push(world.frame,type)
          break;
        default:
          console.error('unknown type',type)
          return null;
      }
    }
    network.send(buf);
  })

  // prebuild an ACK packet
  var ack = new ArrayBuffer(3);
  var ackData = new DataView(ack);
  ackData.setInt8(2,World.ACK);

  // receiving input
  network.on('message',function(buf){
    var data = new buffer.Reader(buf);
    var frame = data.getUint16()
    var sendAck = true;

    while(data.offset < buf.byteLength){
      var type = data.getInt8();
      switch(type){
        case World.ACK:
          console.log('%s ack',frame)
          sendAck = false
          break;
        case World.MOVE:
          var p = data.getUint8();
          var x = data.getFloat32();
          console.log('%s network move',frame,p,x)
          networkQueue.push(frame,type,p,x)
          break;
        case World.SHOOT:
          var p = data.getUint8();
          console.log('%s network shoot',frame,p)
          networkQueue.push(frame,type,p)
          break;
        case World.PAUSE:
          console.log('%s network pause',frame)
          networkQueue.push(frame,type)
          break;
        case World.PLAY:
          console.log('%s network play',frame)
          networkQueue.push(frame,type)
          break;
        case World.OVER:
          console.log('%s network over',frame)
          networkQueue.push(frame,type)
          break;
        default:
          console.error('invalid network input')
          return false;
      }
    }

    forward(ctx.networkGame,frame)

    // respond with an ACK to avoid the
    // message buffer to grow too large
    if( sendAck ){
      ackData.setUint16(0,ctx.networkGame.world.frame);
      network.send(ack)
    }
  })

  function replay(){
    if( ctx.networkGame.world.frame < ctx.game.world.frame ){
      var inputs = new Inputs()
      inputs.readFrom(0,ctx.game.world.frame,[ctx.game.inputs,ctx.networkGame.inputs])
      ctx.game.replay(ctx.networkGame.world,inputs)
    } else {
      console.log('network world is ahead %s, waiting until %s',ctx.networkGame.world.frame, ctx.game.world.frame)
    }
  }
}

// [frame,type,args...,frame,type,args...]
var localQueue = []
  , networkQueue = []

function forward(game,frame){
  // console.log('forward to',frame)
  // update the networkGame with both
  // local and network input until it's
  // `world.frame == frame`
  var steps = frame - game.world.frame;
  for(var i=0; i < steps; i++ ){
    // check if there's any queued local inputs to
    // be applied.
    checkQueue(localQueue,game)
    checkQueue(networkQueue,game)
    game.update();
  }
  console.log('updated networkgame to',game.world.frame)
}


function checkQueue(q,game){
  // console.log('check queue %s == %s?',q[0],game.world.frame)
  while( q[0] === game.world.frame ){
    var frame = q.shift()
      , type = q.shift();
    switch(type){
      case World.MOVE:
        var p = q.shift();
        var x = q.shift();
        console.log('%s queued move',frame,p,x)
        game.emit('input',type,p,x)
        break;
      case World.SHOOT:
        var p = q.shift();
        console.log('%s queued shoot',frame,p)
        game.emit('input',type,p)
        break;
      case World.PAUSE:
      case World.PLAY:
      case World.OVER:
        console.log('%s queued input',frame,type)
        game.emit('input',type)
        break;
      default:
        console.error('unknown type in queue',type)
    }
  }
}