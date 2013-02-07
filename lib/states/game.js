var debug = require('debug')('states:game')
  , settings = require('../settings')
  , see = require('../support/see')
  , mouse = require('../support/mouse')
  , lock = require('../support/pointer-lock')
  , logger = require('log-worker')
  , keys = require('mousetrap')
  , World = require('../world')
  , Inputs = require('../inputs')
  , NetworkInputs = require('../network-inputs')
  , actions = require('../actions')
  , Game = require('../game')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , $ = require('jquery');


// // temporarily override the debug call with one
// // that uses log-worker
// var id = Date.now().toString(16).slice(6);
// debug = function(fmt){
//   fmt = id+' game '+fmt
//   logger.log.apply(console,arguments)
// }


exports.Setup = {
  enter: function(ctx){

    //hack to make multiplayer param visible to renderer via world
    // TODO remove this because it will cause problems whenever
    //      ctx.multiplayer were to change as it's not a reference
    //      but a copy.
    ctx.game.world.multiplayer = ctx.multiplayer;

    // TODO is this the right direction?
    ctx.game.renderer.activePlayer(ctx.network.winner ? 1 : 0)

    // invert the controls for the "other" player
    settings.data.invertControls = ctx.network.winner;

    setupLevels(ctx,ctx.game)
    setupLevels(ctx,ctx.networkGame)

    // hacking the timestep. 30 fps in multiplayer
    // for now. it works better when we send packets
    // at 30fps instead of 60fps.
    // TODO obviously not rely on the game "update"-event
    //      for sending data. buffer and send at another
    //      frequency.
    if( ctx.multiplayer ){
      console.log('30FPS')
      Game.TIMESTEP = 1/30;

      NetworkInputs.start(ctx)

      this.disconnected = function(){
        // TODO store input history
        // and have some kind of "don't leave this page
        // and get your friend to reconnect on this url"
        // message and when friend reconnects send the
        // history, let the game resync /game/resync (web worker?)
        // and then go to /game/wait. when both peers are at
        // /game/wait go to /game/start and let the game begin
        // TODO maybe we can store it in local storage?
        see('/friend/left')
      }
      ctx.network.on('disconnected',this.disconnected)

    } else {
      console.log('60FPS')
      Game.TIMESTEP = 1/60;
    }

    var game = ctx.game
      , world = game.world
      , isLeft = 0
      , isRight = 0;

    this.update = function(world,timestep){
      if( world.paused ) return;
      var dir = settings.data.invertControls ? -1 : 1
      isLeft  && game.emit('input',World.MOVE,world.me.paddle,-settings.data.keyboardSensitivity*10*dir);
      isRight && game.emit('input',World.MOVE,world.me.paddle,+settings.data.keyboardSensitivity*10*dir);
      mouse.tick() // will emit 'move' or 'click'
    }
    game.on('pre update',this.update)


    mouse.on('move',function(dx,dy,dt){
      var dir = settings.data.invertControls ? -1 : 1
      game.emit('input',World.MOVE,world.me.paddle,dx * settings.data.mouseSensitivity*dir)
    })

    if( ctx.multiplayer ){
      this.pathnameChange = function(pathname){
        switch(pathname){
          // TODO /game/next?! maybe not since it's triggered by the simulation...
          case '/game/play':
            if( ctx.pathname !== '/game/play' && ctx.pathname !== '/game/start')
              see('/game/play');
            break;
          case '/game/pause':
            if( ctx.pathname === '/game/play' )
              see('/game/pause');
            break;
        }
      }
      ctx.network.on('change pathname',this.pathnameChange)
    }

    keys.bind(['left','a'],function(){ isLeft = 1; },'keydown')
    keys.bind(['left','a'],function(){ isLeft = 0; },'keyup')
    keys.bind(['right','d'],function(){ isRight = 1; },'keydown')
    keys.bind(['right','d'],function(){ isRight = 0; },'keyup')
    // keys.bind(['up','w'],function(){ game.emit('input',World.SHOOT,world.me.paddle) })
    // mouse.on('click',function(x,y,dt){ game.emit('input',World.SHOOT,world.me.paddle); })
    mouse.start(document.getElementById('game'))
  },

  leave: function(ctx){
    NetworkInputs.stop(ctx)

    ctx.network.off('change pathname',this.pathnameChange)
    ctx.network.off('disconnected',this.disconnected)

    ctx.game.off('pre update',this.update)
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

    $('#scores').hide()


    this.play = $('.play',ctx.el).show()
    this.play.on('click',function(){
      $('.game-controls').fadeOut(300);
      $('.info-animation', ctx.el).delay(500).removeClass('hidden').hide().fadeIn({duration:400});
      setTimeout(function(){
        see('/game/start')
      }, 5000);
    });
    keys.bind('space', function(){ see('/game/start') });


    // use pointer lock if activated and available
    // here instead of where the others are so we
    // can get the maybe-required-mouse-click event
    // when the user clicks "start"
    if( lock.available && settings.data.pointerLock ){
      this.pointer = lock(this.play[0]);
      this.pointer.on('move',function(dx,dy){
        var dir = settings.data.invertControls ? -1 : 1
        ctx.game.emit('input',World.MOVE,ctx.game.world.me.paddle,dx * settings.data.mouseSensitivity)
      })
      // fallback to mouse move in case it's denied
      this.pointer.on('error',function(){
        settings.data.pointer = null;
        mouse.start()
      })
      this.pointer.on('release', function(){
        mouse.start()
      })
      mouse.stop();
    }
  },

  leave: function(ctx){
    this.play.off('click');
    keys.unbind('space');
    $('#scores').show()

  }
}


exports.Waiting = {
  enter: function(ctx){},
  leave: function(ctx){}
}

exports.Start = {

  enter: function(ctx){

    // start both games.
    // (game, local, withPuck)
    startGame(ctx.game,!ctx.network.winner,1)
    startGame(ctx.networkGame,ctx.network.winner,1)

    // update the scores
    updateScores(ctx.game.world)

    // show scores
    $("#scores .singleplayer").toggle(!ctx.multiplayer);
    $("#scores .multiplayer").toggle(!!ctx.multiplayer);

    // AI
    // singleplayer
    if( !ctx.multiplayer ){
      ctx.game.ai.setTarget(ctx.game.world.opponent.paddle);
      if( ctx.networkGame ){
        ctx.networkGame.ai.setTarget(ctx.networkGame.world.opponent.paddle);
      }

    // multiplayer
    } else {
      // debug multiplayer AI
      if( ~window.location.href.indexOf('ai') ){
        ctx.game.ai.setTarget(ctx.networkGame.world.me.paddle);
      }
    }

    see('/game/play')
  },

  leave: function(ctx){
  }

}

exports.Play = {
  enter: function(ctx){
    // just in case we're not already here...
    ctx.renderer.changeView("play");

    var countdown = function(nr) {
      if (nr > 0) {
        this.timeout = setTimeout(countdown, 1000, nr-1);
        $('.countdown-number')
          .eq(nr-1).addClass('visible')
          .siblings().removeClass('visible');
      } else {
        $('.game-play').removeClass('active');
        $('.countdown-number.visible').removeClass('visible')
        keys.bind(['esc','space'], function(){ see('/game/pause') })
        ctx.game.emit('input',World.PLAY)
      }
    }.bind(this)

    // wait until we're in play view
    var offset = ctx.latency || 0;
    this.timeout = setTimeout(function(){
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

exports.Next = {

  enter: function(ctx){
    var world = ctx.game.world;

    console.log('%s round over',world.frame)
    debug('%s round over',world.frame)

    // update the scores
    updateScores(world)

    // round over when someone reaches 3
    var roundOver = world.me.score === 3 || world.opponent.score === 3;
    var winner = world.me.score === 3 ? world.me : world.opponent;

    // multiplayer
    if( ctx.multiplayer ){

      // round over = game over!
      if( roundOver ){
        console.log('multiplayer game over')
        debug('multiplayer game over')
        world.over = true;

        // TODO wait for other player
        if( ctx.network.pathname === '/game/next' ){
          return see('/game/over')

        } else {
          ctx.network.once('change pathname',function(){
            see('/game/over')
          })
        }

        // return see('/game/over')

      // next round!
      } else {
        console.log('multiplayer next round!')
        debug('multiplayer next round!')

        // TODO wait for other player
        if( ctx.network.pathname === '/game/next' ){
          return see('/game/start')

        } else {
          ctx.network.once('change pathname',function(){
            see('/game/start')
          })
        }

      }

    // singleplayer
    } else {

      //  round over + opponent winner = game over!
      if( roundOver && winner === world.opponent ){
        console.log('singleplayer game over')
        debug('singleplayer game over')
        world.over = true;
        return see('/game/over')

      // round over + me winner = level up!
      } else if( roundOver && winner === world.me ){
        console.log('singleplayer level up!')
        debug('singleplayer level up!')
        world.over = true; // will reset scores (game isn't over, just the level)
        ctx.game.puppeteer.up()
        return see('/game/start')

      // next round!
      } else {
        console.log('singleplayer next round!')
        debug('singleplayer next round!')
        return see('/game/start')
      }
    }
  },


  leave: function(ctx,next){
    // give some time for the bear to dance etc...
    setTimeout(next,4000)
  }

}


exports.Over = {
  enter: function(ctx){
    $("#scoreboard-multi").toggle(!!ctx.multiplayer)
    $("#scoreboard-single").toggle(!ctx.multiplayer)
    $("#highscore-rally").html( ctx.game.world.maxAlive )
    $('#scores').hide()

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
    $('.game-over .play').on('click',restart)

    ctx.renderer.triggerEvent("gameOver");
    ctx.renderer.changeView("gameOver");
  },

  leave: function(ctx){
    keys.unbind('space')
    $('.game-over .play').off('click')
    $('#scores').show()
  }
}

function startGame(game,local,withPuck){
  // ctx.networkGame is not available in mobile
  if( !game ) return;

  var world = game.world;

  // reset the game
  game.reset();

  // easy player access
  world.me = local ? world.players.a : world.players.b;
  world.opponent = local ? world.players.b : world.players.a;

  // create paddles
  world.players.a.paddle = actions.createPaddle(world,world.players.a);
  world.players.b.paddle = actions.createPaddle(world,world.players.b);

  // create shields
  actions.createShields(world,world.players.a)
  actions.createShields(world,world.players.b)

  // create puck
  if( withPuck )
    actions.puckCreateCenter(world)
}


function updateScores(world){
  $('#scores li').addClass('active')
  $('#scores .singleplayer .player li').slice(world.me.score).removeClass('active');
  $('#scores .singleplayer .opponent li').slice(world.opponent.score).removeClass('active');
  $('#scores .multiplayer .player li').slice(world.me.score).removeClass('active');
  $('#scores .multiplayer .opponent li').slice(world.opponent.score).removeClass('active');
}

function setupLevels(ctx,game){
  // ctx.networkGame is not available in mobile
  if( !game ) return;
  game.puppeteer.on('change',function(level){
    // keep a reference to the current level in world
    // (it's just easier in the actions this way)
    game.world.level = this.levels[level]
    settings.changeTheme(game.world.level.theme)

    $("#level").html(level+1);

    // restart game
    if( !game.replaying && ctx.pathname == '/game/play' )
      see('/game/start')
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

