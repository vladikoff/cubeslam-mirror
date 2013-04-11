var debug = require('debug')('states:game')
  , settings = require('../settings')
  , tracking = require('../tracking')
  , see = require('../support/see')
  , mouse = require('../support/mouse')
  , exclude = require('../support/exclude')
  , keys = require('mousetrap')
  , World = require('../world')
  , inputs = require('../inputs')
  , actions = require('../actions')
  , puppeteer = require('../puppeteer')
  , Game = require('../game')
  , Themes = require('../themes')
  , diff = require('../support/diff')
  , now = require('../support/now')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , $ = require('jquery')
  , dmaf = require('../dmaf.min');

var EPS = 1e-6;
function eps(x){ return Math.round(x/EPS) * EPS }

exports.Setup = {
  enter: function(ctx){
    debug('setup enter')
    $('#scores .level').show();
    $('#scores li').addClass('active');
    $('#extras').show();

    if( ctx.multiplayer ){
      // create a network game
      ctx.sync = new Game('sync');
      $('#scores .level').hide();
      $('#extras').hide();

      if( ctx.query.render == 'sync' ){
        var Renderer = require('../renderer-2d')
        ctx.sync.setRenderer(new Renderer(document.getElementById('canv-db')))
      }
    }

    // set the active player in the renderer
    ctx.renderer.activePlayer(!ctx.multiplayer || ctx.network.winner ? 0 : 1, false, ctx.multiplayer)

    // invert the controls for the "other" player
    settings.data.invertControls = ctx.multiplayer && !ctx.network.winner;

    // set the correct levels namespace
    if( ctx.mobile ){
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

    var game = ctx.game
      , world = game.world
      , isLeft = 0
      , isRight = 0;

    this.update = function(world,timestep){
      switch(world.state){
        case World.PREVIEW:
        case World.PLAYING:
        case World.OVER:
          break;
        default:
          return;
      }
      var dir = settings.data.invertControls ? -1 : 1
      isLeft  && inputs.record(inputs.types.MOVE,world.me.paddle,eps(-settings.data.keyboardSensitivity*10*dir));
      isRight && inputs.record(inputs.types.MOVE,world.me.paddle,eps(+settings.data.keyboardSensitivity*10*dir));
      if(ctx.touch){
        mouse.tick() // will emit 'move' or 'click'
      }
    }

    game.on('pre update',this.update)
    game.on('pre update',inputs.process)

    if( ctx.multiplayer ){
      // used to measure the time since the last packet
      // to send KEEP_ALIVE packets.
      var lastSent = now()
        , sendRate = 1000/15
        , keepAlive = 250; // ms

      game.on('enter frame',function(world){
        var n = now();
        if( n - lastSent > sendRate ){
          if( inputs.network.flush() ){
            lastSent = n;
          } else if( world.state == World.PLAYING && n - lastSent > keepAlive ){
            inputs.record(inputs.types.KEEP_ALIVE);
          }
        }
      })

      var tell = dmaf.tell
        , noop = function(){}
        , lock = false;
      game.on('leave frame',function(world){
        var state = ctx.sync.world.state
          , frame = ctx.sync.world.frame;

        // silence
        dmaf.tell = noop;

        // forward the sync game
        inputs.network.forward(ctx.sync,world.frame)

        // pause if the sync and game frames are too
        // far apart. or one client will replay a lot
        // every update and thus be very jittery.
        var diff = ctx.game.world.frame - ctx.sync.world.frame;
        if( !lock && ctx.sync.world.state == World.PLAYING && diff > 120 ){
          console.warn('games are too far apart (%s frames). waiting until sync catches up.',diff)
          // ctx.game.pause()
          ctx.game.world.setState(World.PAUSED)
          $('#latency').addClass('active')
          lock = true;

        // start updating game again when caught up
        } else if( lock && diff < 10 ){
          // ctx.game.resume()
          ctx.game.world.setState(World.PLAYING)
          $('#latency').removeClass('active')
          lock = false;

        // or replay!
        } else if( !lock && (ctx.sync.world.state != state || ctx.sync.world.frame != frame) ){
          inputs.network.replay(ctx.sync.world,world)
        }

        // end of silence
        dmaf.tell = tell;
      })

      this.pathnameChange = function(pathname){
        switch(pathname){
          case '/game/pause':
            if( ctx.pathname === '/game/play' )
              see(pathname);
            break;
          case '/game/play':
            if( ctx.pathname === '/game/pause' )
              see(pathname);
            break;
        }
      }

      ctx.network.on('change pathname',this.pathnameChange)
      ctx.network.on('message',inputs.network.onmessage)
      inputs.network.on('message',function(buf){ctx.network.send(buf)})
    }

    mouse.on('move',function(dx,dy,dt){
      var dir = settings.data.invertControls ? -1 : 1
      inputs.record(inputs.types.MOVE,world.me.paddle,dx * settings.data.mouseSensitivity*dir)
    })

    keys.bind(['left','up','a'],function(){ isLeft = 1; },'keydown')
    keys.bind(['left','up','a'],function(){ isLeft = 0; },'keyup')
    keys.bind(['right','down','d'],function(){ isRight = 1; },'keydown')
    keys.bind(['right','down','d'],function(){ isRight = 0; },'keyup')
  },

  leave: function(ctx){
    debug('setup leave')

    inputs.reset()
    inputs.network.off('message')
    ctx.network.off('message',inputs.network.onmessage)
    ctx.game.off('pre update',inputs.process)
    ctx.game.off('enter frame')
    ctx.game.off('leave frame')

    this.pathnameChange && ctx.network.off('change pathname',this.pathnameChange)

    if( ctx.network.remote ){
      ctx.network.remote.off('hashes')
      ctx.network.remote.off('world')
    }

    keys.unbind(['esc','space'])
    keys.unbind(['right','d'],'keyup')
    keys.unbind(['right','d'],'keydown')
    keys.unbind(['left','a'],'keyup')
    keys.unbind(['left','a'],'keydown')

    // reset game to INIT
    ctx.game.off('pre update',puppeteer.update)
    ctx.game.off('pre update',this.update)
    ctx.game.reset();
    ctx.game.world.players.a.reset(true, true);
    ctx.game.world.players.b.reset(true, true);
    ctx.game.world.setState(World.INIT)
    ctx.game.world.level = null;
    ctx.afterStart = null;

    // remove ai when going from single to
    // multiplayer
    ctx.game.ai.setTarget(null);

    // make sure sync is removed (will be re-created)
    if( ctx.sync ){
      ctx.sync.off('update')
      ctx.sync.off('pre update')
      ctx.sync.off('post update')
      ctx.sync.ai.setTarget(null);
      ctx.sync = null;
    }

    // mouse/touch controls
    mouse.off('move')
    if(ctx.touch) {
      mouse.off('click')
      mouse.stop()
    }
  }
}


exports.Instructions = {
  enter: function(ctx){
    debug('information enter')

    dmaf.tell('info_screen')

    startGame(ctx.game,ctx.network.winner,ctx.multiplayer,true)
    startGame(ctx.sync,ctx.network.winner,ctx.multiplayer,true)

    ctx.renderer.changeView("play");

    $('#scores').hide()

    $('.game-controls').show();
    $('.info-animation', ctx.el).addClass('hidden').hide();

    var self = this;

    this.play = $('.play',ctx.el).show()
    this.play.one('click',function(){
      $('.game-controls').fadeOut(300);
      $('.info-animation.objective', ctx.el).delay(500).removeClass('hidden').hide().fadeIn({duration:400});
      //Hack to easily get past info
      keys.unbind('space');
      keys.bind('space', function(){ infoComplete(ctx) });
      $('.info-animation.objective', ctx.el).one('click',function(){ infoComplete(ctx) })
      clearTimeout(self.gameStartTimeout);
      self.gameStartTimeout = setTimeout(function(){
        infoComplete(ctx)
      }, 5000);
    })
    keys.bind('space', function(){ $('.play',ctx.el).click() });

    if(ctx.mobile){
      $('.game-controls').hide();
      var mob = $('.info-animation.mobile', ctx.el).removeClass('hidden').hide().fadeIn({duration:400});
      mob.parent().show();
      self.gameStartTimeout = setTimeout(function(){
        mob.parent().fadeOut(300);
        self.play.click();
      }, 5000);
    }

    // autonavigate while testing multiplayer
    if( ctx.query.autonav || ctx.query.play){
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
    $('.info-animation', ctx.el).unbind('click')

    $("#scores .singleplayer").toggle(!ctx.multiplayer);
    $("#scores .multiplayer").toggle(!!ctx.multiplayer);

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
    this.waiting = waitFor(ctx,'/game/wait','/game/prompt/round')
  },

  leave: function(ctx,next){
    this.waiting && ctx.network.off('change pathname',this.waiting)

    // wait until we're in play view
    // and offset for latency
    var offset = ctx.network.winner ? 0 : (ctx.latency || 0);
    clearTimeout(this.timeout);
    this.timeout = setTimeout(next, 1000 - offset);
  },

  cleanup: function(ctx){
    clearTimeout(this.timeout);
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
      if( level > 1 ) {
         _gaq.push(['_trackEvent', (ctx.multiplayer)?'2p':'1p', 'level ' + (level-1) + ' completed', undefined,Math.round(levelTime/1000) ]);
      }
      tracking.currentLevel = ctx.game.world.level.index;
      tracking.levelStartTime = Date.now();
      _gaq.push(['_trackEvent', (ctx.multiplayer)?'2p':'1p', 'level ' + level + ' started', undefined, level ]);
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
    if( !ctx.multiplayer ){
      ctx.game.ai.setTarget(ctx.game.world.opponent.paddle);

    }

    see('/game/play')
  },

  leave: function(ctx){
    ctx.renderer.changeView("play");
  }

}

exports.Play = {
  enter: function(ctx){
    ctx.game.ai.start();
    dmaf.tell('game_screen');
    ctx.renderer.triggerEvent("gameStart");
    $('.game-play').removeClass('active');
    keys.bind(['esc','space'], see.bind('/game/pause'))
    $('button.pause').on('click', see.bind('/game/pause'))
    this.timeout = setTimeout(function(){
      ctx.game.world.setState(World.PLAYING)
      ctx.sync && ctx.sync.world.setState(World.PLAYING)
    }, 952.38)

    // add verification hashes
    if( ctx.multiplayer && ctx.query.verify ){
      this.unverify = verifyHashes(ctx);
    }
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
  },

  cleanup: function(){
    this.unverify && this.unverify();
    clearTimeout(this.timeout)
  }
}


exports.Pause = {
  enter: function(ctx){
    ctx.game.ai.stop();
    dmaf.tell("pause");
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
    dmaf.tell("unpause")
  }
}

exports.Next = {

  enter: function(ctx){
    var world = ctx.sync ? ctx.sync.world : ctx.game.world;

    ctx.game.ai.stop();

    debug('%s round over',world.frame)

    // reset the input ack
    inputs.network.reset()

    console.log('NEEEEXT!\n\n\n\n\n\n\n')

    var frame = world.frame;

    // update the score for the opponent
    // TODO this will fail if hit was on the other world
    var other = ctx.game.world.players.a.hit !== -1 || world.players.a.hit !== -1
                ? world.players.b
                : world.players.a;
    other.score += 1;

    // hides everything a bit early for know
    ctx.game.reset()
    ctx.renderer.triggerEvent("resetPaddles");

    // round over when someone reaches 3
    var maxBalls = 3; // TODO setting?
    var gameOver = world.players.a.score >= maxBalls || world.players.b.score >= maxBalls;
    var winner = world.players.a.score > world.players.b.score
               ? world.players.a
               : world.players.b;

    updateScores(world);

    _gaq.push(['_trackEvent', ctx.multiplayer?'2p':'1p', (gameOver)?'game over':'round', undefined ,frame ]);

    // multiplayer
    if( ctx.multiplayer ){
      if( winner === world.me ){
        dmaf.tell('user_won_match')
        $('.state.game-prompt-over h4.win').show().siblings().hide();
      } else {
        dmaf.tell('user_lost_match')
        $('.state.game-prompt-over h4.loose').show().siblings().hide();
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
        ctx.renderer.triggerEvent("gameOver");
        this.waiting = waitFor(ctx,'/game/next','/game/prompt/over');

      // next round!
      } else {
        debug('multiplayer next round!')
        dmaf.tell('countdown_short')
        world.setState(World.NEXT_ROUND)
        ctx.renderer.triggerEvent("roundOver");
        this.waiting = waitFor(ctx,'/game/next','/game/prompt/round');

      }

    // singleplayer
    } else {
      //  round over + opponent winner = game over!
      if( gameOver && winner === world.opponent ){
        debug('singleplayer game over')
        dmaf.tell('user_lost_match')
        world.setState(World.GAME_OVER)
        ctx.renderer.triggerEvent("gameOver")
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

          ctx.renderer.triggerEvent("levelUp");

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

        ctx.renderer.triggerEvent("roundOver");
        world.setState(World.NEXT_ROUND)

        clearTimeout(this.nextRoundTimeout)
        this.nextRoundTimeout = setTimeout(function(){

          ctx.renderer.triggerEvent("startCountDown");
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
    this.nextTimeout = setTimeout(next,500)
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

    $("#scoreboard-multi").toggle(!!ctx.multiplayer)
    $("#scoreboard-single").toggle(!ctx.multiplayer)
    $('#scores').hide()

    if(!ctx.multiplayer){
      $('#single-levels').text(ctx.game.world.level.index+1);
    } else {
      $('#me-levels i').text(ctx.sync.world.me.wins);
      $('#opponent-levels i').text(ctx.sync.world.opponent.wins);
    }

    $('.main-menu',ctx.el).on('click',see.bind('/main-menu'));

    function restart(){
      $('.play',ctx.el).off('click');
      keys.unbind('space');

      $('.info-animation', ctx.el).unbind('click')

      _gaq.push(['_trackEvent', (ctx.multiplayer)?'2p':'1p', 'restarted ' + (tracking.replayClicks++) + ' times' ]);

      ctx.renderer.triggerEvent("restart");

      if( ctx.multiplayer ) {
        ctx.renderer.triggerEvent("levelUp");
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

    ctx.renderer.changeView("gameOver");
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
  console.log('  waiting for %s -> %s',path,then)
  if( ctx.network.pathname === path ){
    see(then)
    return null;

  } else {
    console.log('  waiting for pathname change')
    var next;
    next = function(pathname){
      console.log('  network pathname change', pathname)
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
  if( !game ) return;

  var world = game.world;

  // add an update listener
  game.on('pre update',puppeteer.update)

  // debug shortcut
  if( !isNaN(ctx.query.level) ){
    puppeteer.goto(world,parseInt(ctx.query.level)-1);
    console.log('DEBUG LEVEL',ctx.query.level)

  } else {
    puppeteer.goto(world,0)
  }
}

function startGame(game,local,multi,preview){
  // ctx.sync is not available in mobile
  // console.error('startGame', game, local, withPuck)
  if( !game ) return;

  var world = game.world;

  // easy player access
  world.me = !multi || local ? world.players.a : world.players.b;
  world.opponent = !multi || local ? world.players.b : world.players.a;

  // because I'm too lazy to do this better
  world.multiplayer = multi;

  // reset the game
  game.reset();

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
  $("#level-prompt h2 span")
    .html(level+1)
    .closest('section')
    .toggleClass('start', level==0); // adds start class for transition delay purposes
  $("#level").html(level+1);

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

function verifyHashes(ctx){
  var hashes = {}
    , jsons = {}
    , interval;

  keys.bind('.',sendHashes)
  ctx.network.remote.on('hashes',compareHashes)
  ctx.network.remote.on('world',compareWorlds)
  ctx.sync.on('post update',logHashCode)

  if( !isNaN(ctx.query.verify) ){
    var ms = +ctx.query.verify;
    console.warn('sending hashes every %sms',ms)
    interval = setInterval(function(){ keys.trigger('.') },ms)
  }

  return function unverifyHashes(){
    clearInterval(interval);
    keys.unbind('.',sendHashes)
    ctx.network.remote.off('hashes',compareHashes)
    ctx.network.remote.off('world',compareWorlds)
    ctx.sync.off('post update',logHashCode)
  }

  function sendHashes(){
    ctx.network.remote.signal.send({type:'hashes',hashes: hashes})
  }

  function compareHashes(e){
    var frames = [].concat(Object.keys(e.hashes),Object.keys(hashes))
                   .sort(function(a,b){return parseInt(a)-parseInt(b)});
    console.groupCollapsed('comparing hashes')
    var misMatch = null
      , f = -1; // last frame
    for(var i=0; i<frames.length; i++){
      var frame = frames[i];
      if( f === frame ) continue;
      f = frame;
      console.log(' frame: %s local: %s network: %s',frame,hashes[frame],e.hashes[frame]);
      if( hashes[frame] && e.hashes[frame] && hashes[frame] !== e.hashes[frame] ){
        console.log(' hashes does not match (%s vs %s), sending json of world to compare',hashes[frame],e.hashes[frame])
        ctx.network.remote.signal.send({type:'world',frame: frame,world: jsons[frame]})
        misMatch = frame;
        break;
      }
    }
    console.groupEnd('comparing hashes')
    if( misMatch !== null ){
      console.error('hashes did not match at %s',misMatch)
      throw new Error('check diff on other machine plz');
    }
  }

  function compareWorlds(e){
    var misMatch = false;
    console.group('comparing worlds at frame %s',e.frame)
    if( jsons[e.frame] !== e.world ){
      console.log('NOT THE SAME, trying diff:')
      console.log(diff.createPatch('diff for frame '+e.frame,jsons[e.frame],e.world,'local','remote'))
      console.log('remote',[JSON.parse(e.world)])
      console.log('local',[JSON.parse(jsons[e.frame])])
      misMatch = true;
    }
    console.groupEnd('comparing worlds at frame %s',e.frame)

    if(misMatch){
      throw new Error('check diff plz');
    }
  }

  // used as JSON replacer to
  // find undefined values
  function unhide(k,v){
    if( typeof v == 'undefined' )
      return 'undefined'
    return v;
  }

  function logHashCode(world){
    // hash and store without me/opponent/name
    hashes[world.frame] = world.code()
    exclude(world,World.EXCLUDED,function(world){
      jsons[world.frame] = JSON.stringify(world,unhide,2)
    })
  }
}
