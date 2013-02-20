var debug = require('debug')('states:game')
  , settings = require('../settings')
  , see = require('../support/see')
  , mouse = require('../support/mouse')
  , lock = require('../support/pointer-lock')
  , keys = require('mousetrap')
  , World = require('../world')
  , Inputs = require('../inputs')
  , NetworkInputs = require('../network-inputs')
  , actions = require('../actions')
  , tick = require('../support/tick')
  , Game = require('../game')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , $ = require('jquery');

function infoComplete(ctx){
  $('#scores').fadeIn(500);
  if( ctx.multiplayer )
    see('/game/wait')
  else
    see('/game/prompt/level')
}

exports.Setup = {
  enter: function(ctx){
    debug('setup enter')

    if( ctx.multiplayer ){
      // create a network game
      ctx.networkGame = new Game('sync');
    }

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

    $ ('#scores').fadeOut(0);

    this.disconnected = function(){
      // TODO store input history
      // and have some kind of "don't leave this page
      // and get your friend to reconnect on this url"
      // message and when friend reconnects send the
      // history, let the game resync /game/resync (web worker?)
      // and then go to /game/wait. when both peers are at
      // /game/wait go to /game/start and let the game begin
      // TODO maybe we can store it in local storage?
    }

    this.roundOver = function(world){
      see('/game/next')
    }

    // hacking the timestep. 30 fps in multiplayer
    // for now. it works better when we send packets
    // at 30fps instead of 60fps.
    // TODO obviously not rely on the game "update"-event
    //      for sending data. buffer and send at another
    //      frequency.
    if( ctx.multiplayer ){
      console.log('30FPS')
      Game.TIMESTEP = 1/30;
      tick.framerate = 30/1000;

      NetworkInputs.start(ctx)
      ctx.network.on('disconnected',this.disconnected)

    } else {
      console.log('60FPS')
      Game.TIMESTEP = 1/60;
      tick.framerate = 60/1000;
      actions.on('round over',this.roundOver)
    }

    var game = ctx.game
      , world = game.world
      , isLeft = 0
      , isRight = 0;

    this.update = function(world,timestep){
      if( world.state !== World.PREVIEW && world.state !== World.PLAYING )
        return;
      var dir = settings.data.invertControls ? -1 : 1
      isLeft  && game.emit('input',World.MOVE,world.me.paddle,-settings.data.keyboardSensitivity*10*dir);
      isRight && game.emit('input',World.MOVE,world.me.paddle,+settings.data.keyboardSensitivity*10*dir);
      if(ctx.mobile)
        mouse.tick() // will emit 'move' or 'click'
    }
    game.on('pre update',this.update)
    if(ctx.mobile) {
      mouse.on('move',function(dx,dy,dt){
        var dir = settings.data.invertControls ? -1 : 1
        game.emit('input',World.MOVE,world.me.paddle,dx * settings.data.mouseSensitivity*dir)
      })
    }

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
        case '/game/over':
          if( ctx.pathname === '/game/play' )
            see('/game/over');
          break;
      }
    }
    if( ctx.multiplayer ){
      ctx.network.on('change pathname',this.pathnameChange)
    }

    keys.bind(['left','a'],function(){ isLeft = 1; },'keydown')
    keys.bind(['left','a'],function(){ isLeft = 0; },'keyup')
    keys.bind(['right','d'],function(){ isRight = 1; },'keydown')
    keys.bind(['right','d'],function(){ isRight = 0; },'keyup')
    // keys.bind(['up','w'],function(){ game.emit('input',World.SHOOT,world.me.paddle) })
    if(ctx.mobile) {
      mouse.on('click',function(x,y,dt){ game.emit('input',World.SHOOT,world.me.paddle); })
      mouse.start(document.getElementById('game'))
    }
  },

  leave: function(ctx){
    debug('setup leave')
    NetworkInputs.stop(ctx)

    ctx.network.off('change pathname',this.pathnameChange)
    ctx.network.off('disconnected',this.disconnected)

    actions.off('round over')
    ctx.game.off('pre update',this.update)
    keys.unbind('right','keyup')
    keys.unbind('right','keydown')
    keys.unbind('left','keyup')
    keys.unbind('left','keydown')
    keys.unbind('up')
    if(ctx.mobile) {
      mouse.off('click')
      mouse.off('move')
      mouse.stop()
    }

  }
}


exports.Instructions = {
  enter: function(ctx){
    debug('information enter')
    startGame(ctx.game,!ctx.network.winner)
    startGame(ctx.networkGame,ctx.network.winner)
    ctx.game.world.setState(World.PREVIEW)

    ctx.renderer.changeView("play");

    $('#scores').hide()

    $('.game-controls').show();
    $('.info-animation', ctx.el).addClass('hidden').hide();

    this.play = $('.play',ctx.el).show()
    var self = this;
    this.play.one('click',function(){
      $('.game-controls').fadeOut(300);
      $('.info-animation', ctx.el).delay(500).removeClass('hidden').hide().fadeIn({duration:400});
      //Hack to easily get past info
      keys.unbind('space');
      keys.bind('space', function(){ infoComplete(ctx) });
      clearTimeout(self.gameStartTimeout);
      self.gameStartTimeout = setTimeout(function(){
        infoComplete(ctx)
      }, 5000);

    })
    keys.bind('space', function(){ $('.play',ctx.el).click() });


    // use pointer lock if activated and available
    // here instead of where the others are so we
    // can get the maybe-required-mouse-click event
    // when the user clicks "start"
    /*if( lock.available && settings.data.pointerLock ){
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
    }*/
  },

  leave: function(ctx){
    debug('information leave')
    if( this.gameStartTimeout )
      clearTimeout( this.gameStartTimeout );
    this.gameStartTimeout = null;

    this.play.off('click');
    keys.unbind('space');

    $("#scores .singleplayer").toggle(!ctx.multiplayer);
    $("#scores .multiplayer").toggle(!!ctx.multiplayer);

    ctx.game.world.setState(World.STARTING)
  }
}

exports.Wait = {
  enter: function(ctx){
    waitFor(ctx,'/game/wait','/game/prompt/round')
  },
  leave: function(ctx,next){
    // wait until we're in play view
    // and offset for latency
    var offset = ctx.latency || 0;
    clearTimeout(this.timeout);
    this.timeout = setTimeout(next, 1000 - offset);
  }
}

exports.Start = {

  enter: function(ctx){

    // start both games.
    // (game, local, withPuck)
    tick.reset()
    startGame(ctx.game,!ctx.network.winner,1)
    startGame(ctx.networkGame,ctx.network.winner,1)

    // show scores
    updateScores(ctx.game.world)

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
      NetworkInputs.reset()
    }

    see('/game/play')
  },

  leave: function(ctx){
    ctx.renderer.changeView("play");
  }

}

exports.Play = {
  enter: function(ctx){
    ctx.renderer.triggerEvent("gameStart");
    $('.game-play').removeClass('active');
    keys.bind(['esc','space'], function(){ see('/game/pause') })
    $('button.pause').on('click', function(){ see('/game/pause') })
    ctx.game.emit('input',World.PLAY)
  },


  leave: function(ctx){
    keys.unbind('esc')
    keys.unbind('space')
    ctx.game.emit('input',World.PAUSE)
    $('button.pause').off('click')
  }
}


exports.Pause = {
  enter: function(ctx){
    $('.play-friend',ctx.el)
      .toggle(!ctx.multiplayer) // hidden if we already play in multiplayer
      .on('click',function(){ see('/game/invite') })

    // TODO listen if the other player resumes the game
    //      when in multiplayer
    setTimeout( function(){
      ctx.afterStart = '/game/play';
      keys.bind('space', function(){ see('/game/prompt/start') })
      $('button.play')
        .on('click',function(){ see('/game/prompt/start') })
    }, 1000);
  },
  leave: function(ctx){
    keys.unbind('space')
    $('.play-friend',ctx.el).off('click');
    $('button.play').off('click');
  }
}

exports.Next = {

  enter: function(ctx){
    var world = ctx.game.world;

    console.log('%s round over',world.frame)
    debug('%s round over',world.frame)

    // round over when someone reaches 3
    var roundOver = world.me.score === 3 || world.opponent.score === 3;
    var winner = world.me.score === 3 ? world.me : world.opponent;

    // multiplayer
    if( ctx.multiplayer ){

      // round over = game over!
      if( roundOver ){
        debug('multiplayer game over')
        world.setState(World.GAME_OVER)
        ctx.renderer.triggerEvent("gameOver");
        waitFor(ctx,'/game/next','/game/over');

      // next round!
      } else {
        debug('multiplayer next round!')
        world.setState(World.NEXT_ROUND)
        ctx.renderer.triggerEvent("roundOver");
        waitFor(ctx,'/game/next','/game/prompt/round')

      }

    // singleplayer
    } else {
      //  round over + opponent winner = game over!
      if( roundOver && winner === world.opponent ){
        debug('singleplayer game over')
        world.setState(World.GAME_OVER)
        ctx.renderer.triggerEvent("gameOver");
        return see('/game/over')

      // round over + me winner = level up!
      } else if( roundOver && winner === world.me ){
        debug('singleplayer level up!')

        setTimeout(function(){
          world.setState(World.NEXT_LEVEL)
          ctx.renderer.triggerEvent("levelUp");
          ctx.game.puppeteer.up();
          see('/game/prompt/level');

        },2000)

        return;
      // next round!
      } else {
        debug('singleplayer next round!')
        world.setState(World.NEXT_ROUND)
        ctx.renderer.triggerEvent("roundOver");
        return see('/game/prompt/round')
      }
    }
  },


  leave: function(ctx,next){
    // TODO don't forget networkGame...
    ctx.game.reset()
    updateScores(ctx.game.world)

    // give some time for the bear to dance etc...
    setTimeout(next,500)
  }

}


exports.Over = {
  enter: function(ctx){
    $("#scoreboard-multi").toggle(!!ctx.multiplayer)
    $("#scoreboard-single").toggle(!ctx.multiplayer)
    $("#highscore-rally").html( ctx.game.world.maxAlive )
    $('#scores').hide()

    if(!ctx.multiplayer)
      $('#single-levels').text(ctx.game.puppeteer.level+1);
    else {
      $('#single-levels').text(ctx.game.puppeteer.level+1);
    }


    $('.play-friend',ctx.el)
      .on('click',function(){ see('/friend/invite') })
      // .attr('disabled',!ctx.multiplayer)

    function restart(){

      ctx.renderer.triggerEvent("restart");

      if(!ctx.multiplayer){
        see('/game/prompt/level')
      } else {
        // TODO check ctx.network.pathname
        console.error('multiplayer restart not implemented')
      }
      return false;
    }

    keys.bind('space',restart)
    $('.game-over .play').on('click',restart)


    ctx.renderer.changeView("gameOver");
  },

  leave: function(ctx){
    keys.unbind('space')
    $('.game-over .play').off('click')
  }
}

function waitFor(ctx,path,then){
  debug('  waiting for %s -> %s',path,then)
  // TODO wait for other player
  if( ctx.network.pathname === path ){
    return see(then)

  } else {
    debug('  waiting for pathname change')
    var next;
    next = function(pathname){
      debug('  network pathname change', pathname)
      if( pathname === path ){
        ctx.network.off('change pathname',next)
        see(then)
      }
    }
    ctx.network.on('change pathname',next)
  }
}


function startGame(game,local,withPuck){
  // ctx.networkGame is not available in mobile
  if( !game ) return;

  var world = game.world;

  // easy player access
  world.me = local ? world.players.a : world.players.b;
  world.opponent = local ? world.players.b : world.players.a;

  // reset the game
  game.reset();

  // create paddles
  world.players.a.paddle = actions.createPaddle(world,world.players.a);
  world.players.b.paddle = actions.createPaddle(world,world.players.b);

  if( withPuck ){
    // create shields
    actions.createShields(world,world.players.a)
    actions.createShields(world,world.players.b)

    // create puck
    actions.puckCreateCenter(world)

    world.setState(World.STARTING)
  }
}

function updateScores(world){
  $('#scores li').addClass('active')
  $('#scores .singleplayer .player li').slice(world.me.score).removeClass('active');
  $('#scores .singleplayer .opponent li').slice(world.opponent.score).removeClass('active');
  $('#scores .multiplayer .player li').slice(world.me.score).removeClass('active');
  $('#scores .multiplayer .opponent li').slice(world.opponent.score).removeClass('active');
  $("#round-prompt h2 span").html(world.opponent.score + world.me.score + 1);

}

function setupLevels(ctx,game){
  // ctx.networkGame is not available in mobile
  if( !game ) return;
  game.puppeteer.on('change',function(level){
    // keep a reference to the current level in world
    // (it's just easier in the actions this way)
    game.world.level = this.levels[level]
    //settings.changeTheme(game.world.level.theme)

    // restart game
    //adds start class for transition delay purposes
    $("#level-prompt h2 span").html(level+1)
      .closest('section').toggleClass('start', level==0);
    $("#level").html(level+1);
  })



  var startLevel = 0;

  // debug shortcut
  var RE_DBG_LEVEL = /[&?]level=(\d+)/g;
  if( RE_DBG_LEVEL.exec(window.location.href) ){
    startLevel = parseInt(RegExp.$1)-1;
    console.log('DEBUG LEVEL',startLevel)
  }

  game.puppeteer.goto(startLevel)
}