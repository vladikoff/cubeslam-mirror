/* global _gaq:true */
var debug = require('debug')('states:game')
  , settings = require('../settings')
  , tracking = require('../tracking')
  , see = require('../support/see')
  , now = require('now')
  , mouse = require('../support/mouse')
  , keys = require('mousetrap')
  , World = require('../world')
  , inputs = require('../inputs')
  , icons = require('../extra-icons')
  , actions = require('../actions')
  , puppeteer = require('../puppeteer')
  , Themes = require('../themes')
  , $ = require('jquery')
  , dmaf = require('../dmaf.min');

exports.Setup = {
  enter: function(ctx){
    debug('setup enter')
    $('#scores .level').show();
    $('#scores li').addClass('active');
    $('#extras').show();

    // set the active player in the renderer
    ctx.renderer.activePlayer(!ctx.multiplayer || ctx.network.winner ? 0 : 1, false, ctx.multiplayer)

    if( ctx.query.god ) {
      settings.data.godMode = true;
    }

    if( ctx.query.momentum == 'off' ){
      settings.data.paddleMomentum = false;
    }

    if( !isNaN(ctx.query.framerate) ){
      var framerate = parseInt(ctx.query.framerate,10);
      settings.data.framerate = framerate;
      settings.data.timestep = 1000/framerate;
    }

    if( !isNaN(ctx.query.speed) ){
      var speed = parseInt(ctx.query.speed,10);
      settings.data.unitSpeed = speed;
    }

    // set the correct levels namespace
    if( ctx.query.ns ){
      puppeteer.namespace(ctx.query.ns);
    } else if( ctx.mobile ){
      puppeteer.namespace('mobile');
    } else if( ctx.multiplayer ){
      puppeteer.namespace('multi');
    } else {
      puppeteer.namespace('single');
    }

    setupLevel(ctx,ctx.game)
    setupLevel(ctx,ctx.sync)
    updateLevel(ctx,ctx.game.world.level.index)

    $('#scores').fadeOut(0);
  },

  leave: function(ctx){
    debug('setup leave')

    inputs.reset()

    // reset game to INIT
    ctx.game.off('pre update',puppeteer.update)
    ctx.game.reset();
    ctx.game.world.players.a.reset(true, true);
    ctx.game.world.players.b.reset(true, true);
    ctx.game.world.setState(World.INIT)
    ctx.game.world.level = null;
    ctx.afterStart = null;

    // remove ai when going from single to
    // multiplayer
    ctx.game.ai.setTarget(null);
  }
}


exports.Instructions = {
  enter: function(ctx){
    debug('information enter')

    dmaf.tell('info_screen')

    startGame(ctx.game,ctx.network.winner,ctx.multiplayer,true)
    startGame(ctx.sync,ctx.network.winner,ctx.multiplayer,true)

    ctx.renderer.changeView('play');

    $('#scores').hide()

    $('.game-controls').show();
    $('.info-animation', ctx.el).addClass('hidden').hide();

    var self = this;

    this.play = $('.play',ctx.el).show()
    this.play.one('click',function(){
      $('.game-controls').fadeOut(300);
      $('.info-animation.mobile', ctx.el).parent().hide();
      $('.info-animation.objective', ctx.el).delay(500).removeClass('hidden').hide().fadeIn({duration:0});

      //Hack to easily get past info
      keys.unbind('space');
      keys.bind('space', function(){ infoComplete(ctx) });
      $('.info-animation.objective', ctx.el).parent().one('click',function(){ infoComplete(ctx) })
      clearTimeout(self.gameStartTimeout);
      self.gameStartTimeout = setTimeout(function(){ infoComplete(ctx) }, 5000);
    })
    keys.bind('space', function(){ $('.play',ctx.el).click() });

    if(ctx.mobile){
     /* if(!ctx.touch) {
        this.play.click()
      } else {
        var mob = $('.info-animation.mobile', ctx.el).removeClass('hidden').hide().fadeIn({duration:400}).parent();
        mob.show();
        self.gameStartTimeout = setTimeout(function(){
          mob.click();
        }, 12000);
        mob.one('click',function(){
          clearTimeout(self.gameStartTimeout);
          self.play.click();
        })
      }*/
      this.play.click()
    }

    // autonavigate while testing multiplayer
    if( ctx.query.autonav || ctx.query.play ){
      infoComplete(ctx)
    }

    //debug round
    if( !isNaN(ctx.query.round) ){
      var round = Math.min(4,ctx.query.round);
      ctx.game.world.me.score = Math.floor(ctx.query.round/2)

      while(ctx.game.world.me.score + ctx.game.world.opponent.score < 4 ){
        ctx.game.world.opponent.score += 1;
      }
    }
  },

  leave: function(ctx, next){
    debug('information leave')
    clearTimeout(this.gameStartTimeout);

    dmaf.tell('info_screen_out')

    this.play.off('click');
    keys.unbind('space');
    $('.info-animation', ctx.el).parent().unbind('click')

    $('#scores .singleplayer').toggle(!ctx.multiplayer);
    $('#scores .multiplayer').toggle(!!ctx.multiplayer);

    $(ctx.el).removeClass('active').addClass('inactive')

    this.nextTimeout = setTimeout(next, 1000)
    ctx.game.world.setState(World.STARTING)
  },

  cleanup: function(ctx){
    clearTimeout(this.nextTimeout)
  }
}

exports.Wait = {
  enter: function(ctx){
    this.waiting = waitFor(ctx,'/game/wait','/game/prompt/level')

    // a timeout in case there's been a race condition and the
    // other player has not received the video as desired.
    clearTimeout(this.timeout);
    this.timeout = setTimeout(function(){
      if( ctx.network.winner ){
        console.log('waited for 10s. trying again to send an offer in case the last one was lost.')
        ctx.network.remote.start();
        ctx.network.sync.start();
      }
    },10000)
  },

  leave: function(ctx,next){
    // wait until we're in play view
    // and offset for latency for the one
    // who came last (and thus has no `this.waiting`)
    //
    // one issues with this latency is that it's
    // based on data channel instead of the signalling
    // api so it may not be precise enough
    //
    // TODO add a EMIT(id) message which will be
    //      executed as soon as it arrives instead of
    //      being enqueued. maybe simply inputs.emit(id)
    //      then we can use that in waitFor()
    //
    // console.log('wait latency',ctx.latency)
    var offset = this.waiting !== null ? 100 : 100+(ctx.latency*2 || 0);
    clearTimeout(this.timeout);
    this.timeout = setTimeout(next, offset);
  },

  cleanup: function(ctx){
    clearTimeout(this.timeout);
    this.waiting && ctx.network.off('change pathname',this.waiting)
  }
}

exports.Start = {

  enter: function(ctx){
    // start both games.
    // (game, local, preview)
    startGame(ctx.game,ctx.network.winner,ctx.multiplayer)
    startGame(ctx.sync,ctx.network.winner,ctx.multiplayer)

    // reset everything in the network
    inputs.network.reset(true)

    // restart the level
    puppeteer.goto(ctx.game.world);
    ctx.sync && puppeteer.goto(ctx.sync.world);
    updateLevel(ctx,ctx.game.world.level.index);

    if( ctx.game.world.level.index != tracking.currentLevel ) {
      var levelTime = Date.now() - tracking.levelStartTime;
      var level = ctx.game.world.level.index+1;
      if( level > 1 && tracking.levelStartTime ) {
        _gaq.push(['_trackEvent', getGACategory(ctx), 'level ' + (level-1) + ' completed', undefined,Math.round(levelTime/1000) ]);
      }
      tracking.currentLevel = ctx.game.world.level.index;
      tracking.levelStartTime = Date.now();

      _gaq.push(['_trackEvent', getGACategory(ctx), 'level ' + level + ' started', undefined, level ]);
    }

    // update the ai based on level
    ctx.game.ai.updateBrain(ctx.game.world.level.ai);
    ctx.sync && ctx.sync.ai.updateBrain(ctx.sync.world.level.ai);

    // copy the sync scores to world
    if( ctx.multiplayer ){
      ctx.game.world.players.a.score = ctx.sync.world.players.a.score;
      ctx.game.world.players.b.score = ctx.sync.world.players.b.score;
    }

    // show scores
    updateScores(ctx.sync ? ctx.sync.world : ctx.game.world)

    // singleplayer
    if( !ctx.multiplayer || ctx.query.ai ){
      ctx.game.ai.setTarget(ctx.game.world.opponent.paddle);
    }

    see('/game/play')
  },

  leave: function(ctx){
    ctx.renderer.changeView('play');
  }

}

exports.Play = {
  enter: function(ctx){
    ctx.game.ai.start();
    dmaf.tell('game_screen');
    ctx.renderer.triggerEvent('gameStart');
    $('.game-play').removeClass('active');
    keys.bind(['esc','space'], see.bind('/game/pause'))
    $('button.pause').on('click', see.bind('/game/pause'))
    this.timeout = setTimeout(function(){
      ctx.game.world.setState(World.PLAYING)
      ctx.sync && ctx.sync.world.setState(World.PLAYING)

      if(ctx.query.benchmark){
        ctx.benchmarkStart = now();
        ctx.benchmarkFrames = 0;

        ctx.benchmarkCount = function(){
          ctx.benchmarkFrames++;
        }
        ctx.game.on('enter frame',ctx.benchmarkCount)
      }

    }, 952.38)

    if(ctx.touch) {
      mouse.start(document.getElementById('game'))
    }
  },

  leave: function(ctx){
    keys.unbind(['esc','space'])
    $('button.pause').off('click')
    // send 10 more requests and see if latency has changed
    ctx.multiplayer && ctx.network.winner && ctx.network.sync.update(10)
    ctx.game.world.setState(World.PAUSED)
    ctx.sync && ctx.sync.world.setState(World.PAUSED)
    if(ctx.touch) {
      mouse.stop(document.getElementById('game'))
    }

    if(ctx.query.benchmark){
      ctx.benchmarkEnd = now();
      ctx.benchmarkCount && ctx.game.off('enter frame',ctx.benchmarkCount)

      var ms = ctx.benchmarkEnd - ctx.benchmarkStart;
      var frames = ctx.benchmarkFrames;
      var fps = frames/(ms/1000);

      $('#benchmarks').append('<p>'+ms.toFixed(2)+'ms, '+frames+' frames = '+fps.toFixed(2)+' avg fps</p>')

      _gaq.push(['_trackEvent', getGACategory() +':benchmark', 'time (ms)', undefined ,ms.toFixed(2) ]);
      _gaq.push(['_trackEvent', getGACategory() +':benchmark', 'frames', undefined ,frames ]);
      _gaq.push(['_trackEvent', getGACategory() +':benchmark', 'average round fps', undefined ,fps.toFixed(2) ]);
    }

  },

  cleanup: function(){
    this.unverify && this.unverify();
    clearTimeout(this.timeout)
  }
}


exports.Pause = {
  enter: function(ctx){
    ctx.game.ai.stop();
    dmaf.tell('pause');
    $('.main-menu',ctx.el)
      .toggle(!ctx.multiplayer) // hidden if we already play in multiplayer
      .on('click',see.bind('/main-menu'))

    clearTimeout(this.timeout)
    this.timeout = setTimeout(function(){
      keys.bind('space', see.bind('/game/play'))
      keys.bind('esc', see.bind('/main-menu'))
      $('button.play', ctx.el).on('click',see.bind('/game/play'))
    }, 1000);
  },
  leave: function(ctx){
    clearTimeout(this.timeout);
    keys.unbind('space')
    keys.unbind('esc')
    $('button.play',ctx.el).off('click')
    $('.main-menu',ctx.el).off('click')
    dmaf.tell('unpause')
  }
}

exports.Next = {

  enter: function(ctx){
    var world = ctx.sync ? ctx.sync.world : ctx.game.world;

    ctx.game.ai.stop();

    debug('%s round over',world.frame)

    // reset the input ack
    inputs.network.reset()

    // reset the icons
    icons.clear()

    // console.log('NEEEEXT!\n\n\n\n\n\n\n')

    var frame = world.frame;

    // update the score for the opponent
    // TODO this will fail if hit was on the other world
    var other = (ctx.game.world.players.a.hit !== -1 || world.players.a.hit !== -1) ? world.players.b : world.players.a;
    other.score += 1;

    // hides everything a bit early for know
    ctx.game.reset()
    ctx.renderer.triggerEvent('resetPaddles');

    // round over when someone reaches 3
    var maxBalls = 3; // TODO setting?
    var gameOver = world.players.a.score >= maxBalls || world.players.b.score >= maxBalls;
    var winner = world.players.a.score > world.players.b.score ? world.players.a : world.players.b;

    updateScores(world);

    _gaq.push(['_trackEvent', getGACategory(ctx), (gameOver)?'game over':'round', undefined ,frame ]);

    // multiplayer
    if( ctx.multiplayer ){
      var $promptEl = $('.state.game-prompt-over .prompt');

      $promptEl.children().hide();

      //report latency
      var sum = tracking.latency.reduce(function(a, b) { return a + b });
      var avg = sum / tracking.latency.length;
      debug('Average latency is ' + avg + ' milliseconds');
      _gaq.push(['_trackEvent', '2p', 'round latency average',undefined,parseInt(avg,10)]);
      tracking.latency.length = 0;

      if( winner === world.me ){
        dmaf.tell('user_won_match')
        $promptEl.find('.win').show();
      } else {
        dmaf.tell('user_lost_match')
        $promptEl.find('.loose').show();
      }

      // round over = game over!
      if( gameOver ){
        debug('multiplayer game over')
        winner.wins += 1;

        if( winner === world.me ){
          // TODO use the correct puck position (same as in actions.roundOver())
          ctx.renderer.triggerEvent('explodeOpponent',{point:0.5})
        }

        world.setState(World.GAME_OVER)
        ctx.renderer.triggerEvent('gameOver');
        this.waiting = waitFor(ctx,'/game/next','/game/prompt/over');

      // next round!
      } else {
        debug('multiplayer next round!')
        dmaf.tell('countdown_short')
        world.setState(World.NEXT_ROUND)
        ctx.renderer.triggerEvent('roundOver');
        this.waiting = waitFor(ctx,'/game/next','/game/prompt/round');

      }

    // singleplayer
    } else {
      //  round over + opponent winner = game over!
      if( gameOver && winner === world.opponent ){
        debug('singleplayer game over')
        dmaf.tell('user_lost_match')
        world.setState(World.GAME_OVER)
        ctx.renderer.triggerEvent('gameOver')
        see('/game/prompt/over')

      // round over + me winner = level up!
      } else if( gameOver && winner === world.me ){
        debug('singleplayer level up!')
        dmaf.tell('user_won_match')
        // TODO use the correct puck position (same as in actions.roundOver())
        ctx.renderer.triggerEvent('explodeOpponent',{point:0.5})
        world.setState(World.NEXT_LEVEL)

        clearTimeout(this.nextLevelTimeout)
        this.nextLevelTimeout = setTimeout(function(){

          world.players.a.reset(true);
          world.players.b.reset(true);

          ctx.renderer.triggerEvent('levelUp');

          puppeteer.up(ctx.game.world);
          ctx.sync && puppeteer.up(ctx.sync.world);
          updateLevel(ctx,ctx.game.world.level.index);

          clearTimeout(this.nextLevelTimeout)
          this.nextLevelTimeout = setTimeout(function(){
            see('/game/prompt/level');
          }, (ctx.mobile ? 1500 : 4000))
        }, (ctx.mobile ? 1000 :  4000))

      // next round!
      } else {
        debug('singleplayer next round!')
        if( other !== world.me ){
          dmaf.tell('user_lost_round');
        }
        else {
          dmaf.tell('user_won_round');
        }

        ctx.renderer.triggerEvent('roundOver');
        world.setState(World.NEXT_ROUND)

        clearTimeout(this.nextRoundTimeout)
        this.nextRoundTimeout = setTimeout(function(){

          ctx.renderer.triggerEvent('startCountDown');
          clearTimeout(this.nextRoundTimeout)
          this.nextRoundTimeout = setTimeout(function(){
            dmaf.tell('countdown_short')
            see('/game/prompt/round')
          },952.38)
        },2000);
      }
    }
  },


  leave: function(ctx,next){

    clearTimeout(this.nextLevelTimeout)
    clearTimeout(this.nextRoundTimeout)

    this.waiting && ctx.network.off('change pathname',this.waiting)

    // give some time for the bear to dance etc...
    if( ctx.multiplayer ){
      this.nextTimeout = setTimeout(next,2500)
    } else {
      this.nextTimeout = setTimeout(next,500)
    }
  },

  cleanup: function(ctx){
    clearTimeout(this.nextLevelTimeout)
    clearTimeout(this.nextRoundTimeout)
    clearTimeout(this.nextTimeout);
  }

}


exports.Over = {
  enter: function(ctx){

    dmaf.tell('gameover_sign_in');

    $('#scoreboard-multi').toggle(!!ctx.multiplayer)
    $('#scoreboard-single').toggle(!ctx.multiplayer)
    $('#scores').hide()

    if(!ctx.multiplayer){
      $('#single-levels i').text(ctx.game.world.level.index+1);
    } else {
      $('#me-levels i').text(ctx.sync.world.me.wins);
      $('#opponent-levels i').text(ctx.sync.world.opponent.wins);
    }

    $('.main-menu',ctx.el).on('click',see.bind('/main-menu'));

    function restart(){
      $('.play',ctx.el).off('click');
      keys.unbind('space');

      $('.info-animation', ctx.el).unbind('click')
      _gaq.push(['_trackEvent', getGACategory(ctx), 'restarted level ' + (ctx.game.world.level.index+1) + ', ' + (tracking.replayClicks++) + ' times' ]);

      ctx.renderer.triggerEvent('restart');

      if( ctx.multiplayer ) {
        ctx.renderer.triggerEvent('levelUp');
        puppeteer.up(ctx.game.world);
        puppeteer.up(ctx.sync.world);
        updateLevel(ctx,ctx.game.world.level.index);
      }

      $('#scores').fadeIn(500);

      if(ctx.multiplayer){
        see('/game/wait')

      } else {
        see('/game/prompt/level')

      }
      return false;
    }

    keys.bind('space',restart)
    $('.play',ctx.el).on('click',restart)

    ctx.renderer.changeView('gameOver');
  },

  leave: function(ctx){
    dmaf.tell('gameover_sign_out');

    ctx.game.reset()
    ctx.sync && ctx.sync.reset()
    updateScores(ctx.sync ? ctx.sync.world : ctx.game.world)

    keys.unbind('space')
    $('.main-menu',ctx.el).on('click')
  }
}

function waitFor(ctx,path,then){
  // console.log('  waiting for %s -> %s',path,then)
  var next = null;
  if( ctx.network.pathname === path ){
    see(then)

  } else {
    // console.log('  waiting for pathname change')
    next = function(pathname){
      // console.log('  network pathname change', pathname)
      if( pathname === path ){
        ctx.network.off('change pathname',next)
        see(then)
      }
    }
    ctx.network.on('change pathname',next)
  }
  return next;
}

function setupLevel(ctx,game){
  // ctx.sync is not available in mobile
  // console.error('startGame', game, local, withPuck)
  if( !game ) {return}

  var world = game.world;

  // add an update listener
  game.on('pre update',puppeteer.update)

  // debug shortcut
  if( !isNaN(ctx.query.level) ){
    puppeteer.goto(world,parseInt(ctx.query.level,10)-1);
    console.log('DEBUG LEVEL',ctx.query.level)

  } else {
    puppeteer.goto(world,0)
  }
}

function startGame(game,local,multi,preview){
  // ctx.sync is not available in mobile
  // console.error('startGame', game, local, withPuck)
  if( !game ) {return}

  var world = game.world;

  // easy player access
  world.me = !multi || local ? world.players.a : world.players.b;
  world.opponent = !multi || local ? world.players.b : world.players.a;

  // because I'm too lazy to do this better
  world.multiplayer = multi;

  // reset the game
  game.reset();

  // let the extra icons know which world
  // it should listen too
  // (will be sync when it exists)
  icons.use(world)

  // create paddles
  world.players.a.paddle = actions.createPaddle(world,world.players.a);
  world.players.b.paddle = actions.createPaddle(world,world.players.b);

  if( preview ){
    world.setState(World.PREVIEW)

  } else {
    // create shields
    actions.createShields(world,world.players.a)
    actions.createShields(world,world.players.b)

    // create puck
    actions.createPuckCenter(world)

    world.setState(World.STARTING)
  }
}

function updateScores(world){
  debug('update scores %s %s - %s',world.name,world.players.a.score,world.players.b.score)
  $('#scores li').addClass('active')
  $('#scores .singleplayer .player li').slice(world.me.score).removeClass('active latest-winner');
  $('#scores .singleplayer .opponent li').slice(world.opponent.score).removeClass('active latest-winner');
  $('#scores .multiplayer .player li').slice(world.me.score).removeClass('active latest-winner');
  $('#scores .multiplayer .opponent li').slice(world.opponent.score).removeClass('active latest-winner');
}

function updateLevel(ctx,level){
  $('#level-prompt span')
    .html(level+1)
    .closest('section')
    .toggleClass('start', level===0); // adds start class for transition delay purposes
  $('#level').html(level+1);

  // make some noise
  dmaf.tell('level_'+level);

  // update theme
  Themes.goto(level);
  $('html').addClass('theme-'+Themes.current.name.replace(' ', ''));
}

function infoComplete(ctx){
  $('#scores').fadeIn(500);
  if( ctx.multiplayer ){
    see('/game/wait')
  } else {
    see('/game/prompt/level')
  }
}

function getGACategory(ctx) {
  var str = '';

  if(ctx.mobile) {
    str += 'css:';
  }
  else {
    str += '3d:';

    if(ctx.multiplayer) {
      str += '2p';
    }
    else {
      str += '1p';
    }
  }

  return str;
}


