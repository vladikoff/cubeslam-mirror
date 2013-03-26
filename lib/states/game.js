var debug = require('debug')('states:game')
  , settings = require('../settings')
  , see = require('../support/see')
  , mouse = require('../support/mouse')
  , keys = require('mousetrap')
  , World = require('../world')
  , inputs = require('../inp')
  , actions = require('../actions')
  , puppeteer = require('../puppeteer')
  , Game = require('../game')
  , diff = require('../support/diff')
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

    if( ctx.multiplayer ){
      // create a network game
      var renderer = null;//new Renderer(document.getElementById('canv-db'));
      ctx.sync = new Game('sync',renderer);
      $('#scores .level').hide();

      if( ctx.query.verify ){
        verifyHashes(ctx);
      }

      // because once in a while some packets will be
      // dropped (at least while DataChannels are not
      // reliable) so we have to try again to empty
      // the netchan buffer.
      // TODO this probably belongs in NetChan
      inputs.on('flush',function(){
        ctx.network.game.flush()
      })
    }

    // update the inputs contexts
    // (in case we added or removed sync)
    inputs.context(ctx);

    // set the active player in the renderer
    ctx.renderer.activePlayer(ctx.network.winner ? 1 : 0, false, ctx.multiplayer)

    // invert the controls for the "other" player
    settings.data.invertControls = ctx.network.winner;

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

    if(!ctx.mobile){
      actions.on('showExtra', showExtraIcon)
      actions.on('removeExtra', hideExtraIcon)
      actions.on('activateExtra', activateExtraIcon)
    }

    actions.on('round over',function(world){
      console.log('ROUND HOUSE!',world.name,ctx.multiplayer)
      inputs.record(inputs.ACK)
      if( !ctx.multiplayer || world.name == 'sync' ){
        world.setState(World.NEXT_ROUND);
        see('/game/next')
      }
    })

    actions.on('pause',function(world){
      console.log('GAME PAUSE!',world.name,ctx.multiplayer)
      inputs.record(inputs.ACK)
      if( !ctx.multiplayer || world.name == 'sync' ){
        world.setState(World.PAUSED);
        see('/game/pause')
      }
    })

    actions.on('resume',function(world){
      console.log('GAME RESUME!',world.name,ctx.multiplayer)
      inputs.record(inputs.ACK)
      if( !ctx.multiplayer || world.name == 'sync' ){
        ctx.afterStart = '/game/play';
        see('/game/prompt/start')
      }
    })

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
      isLeft  && inputs.record(inputs.MOVE,world.me.paddle,eps(-settings.data.keyboardSensitivity*10*dir));
      isRight && inputs.record(inputs.MOVE,world.me.paddle,eps(+settings.data.keyboardSensitivity*10*dir));
      if(ctx.touch){
        mouse.tick() // will emit 'move' or 'click'
      }
    }
    game.on('pre update',this.update)
    game.on('pre update',inputs.process)

    mouse.on('move',function(dx,dy,dt){
      var dir = settings.data.invertControls ? -1 : 1
      inputs.record(inputs.MOVE,world.me.paddle,dx * settings.data.mouseSensitivity*dir)
    })

    keys.bind(['left','a'],function(){ isLeft = 1; },'keydown')
    keys.bind(['left','a'],function(){ isLeft = 0; },'keyup')
    keys.bind(['right','d'],function(){ isRight = 1; },'keydown')
    keys.bind(['right','d'],function(){ isRight = 0; },'keyup')

    if(ctx.touch) {
      mouse.start(document.getElementById('game'))
    }
  },

  leave: function(ctx){
    debug('setup leave')

    inputs.off('flush')
    inputs.off('message')
    inputs.reset()
    inputs.pause(true)
    ctx.game.off('pre update',inputs.process)
    ctx.network.off('message',inputs.onmessage)

    if( ctx.network.remote ){
      ctx.network.remote.off('hashes')
      ctx.network.remote.off('world')
    }

    keys.unbind('.')
    keys.unbind(['esc','space'])
    keys.unbind(['right','d'],'keyup')
    keys.unbind(['right','d'],'keydown')
    keys.unbind(['left','a'],'keyup')
    keys.unbind(['left','a'],'keydown')

    actions.off('pause')
    actions.off('round over')
    actions.off('showExtra')
    actions.off('removeExtra')
    actions.off('activateExtra')
    resetExtraIcons();


    // reset game to INIT
    ctx.game.off('pre update',puppeteer.update)
    ctx.game.off('pre update',this.update)
    ctx.game.reset();
    ctx.game.world.players.a.reset(true, true);
    ctx.game.world.players.b.reset(true, true);
    ctx.game.world.setState(World.INIT)
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

    startGame(ctx.game,!ctx.network.winner,true)
    startGame(ctx.sync, ctx.network.winner,true)

    ctx.renderer.changeView("play");

    $('#scores').hide()

    $('.game-controls').show();
    $('.info-animation', ctx.el).addClass('hidden').hide();

    var self = this;

    this.play = $('.play',ctx.el).show()
    this.play.one('click',function(){
      $('.game-controls').fadeOut(300);
      $('.info-animation', ctx.el).delay(500).removeClass('hidden').hide().fadeIn({duration:400});
      //Hack to easily get past info
      keys.unbind('space');
      keys.bind('space', function(){ infoComplete(ctx) });
      $('.info-animation', ctx.el).one('click',function(){ infoComplete(ctx) })
      clearTimeout(self.gameStartTimeout);
      self.gameStartTimeout = setTimeout(function(){
        infoComplete(ctx)
      }, 5000);
    })
    keys.bind('space', function(){ $('.play',ctx.el).click() });

    if(ctx.mobile){
      $('.game-controls').hide();
      this.play.click();
    }

    // autonavigate while testing multiplayer
    if( ctx.query.autonav || ctx.query.play){
      infoComplete(ctx)
    }

    //debug round
    if( !isNaN(ctx.query.round) ){
      var round = Math.min(4,ctx.query.round);
      ctx.game.world.me.score = Math.floor(ctx.query.round/2)

      while(ctx.game.world.me.score + ctx.game.world.opponent.score < 4 )
        ctx.game.world.opponent.score += 1;
    }
  },

  leave: function(ctx, next){
    debug('information leave')
    clearTimeout(this.gameStartTimeout);

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
    startGame(ctx.game,!ctx.network.winner)
    startGame(ctx.sync, ctx.network.winner)

    // copy to the sync world
    // (especially the game scores)
    if( ctx.sync ){
      ctx.sync.world.copy(ctx.game.world);
    }

    // reset inputs
    inputs.reset()
    inputs.resume()

    // restart the level
    puppeteer.goto(ctx.game.world);
    ctx.sync && puppeteer.goto(ctx.sync.world);
    updateLevel(ctx,ctx.game.world.level.index);

    // update the ai based on level
    ctx.game.ai.updateBrain(ctx.game.world.level.ai);
    ctx.sync && ctx.sync.ai.updateBrain(ctx.sync.world.level.ai);

    // show scores
    updateScores(ctx.game.world)

    // singleplayer
    if( !ctx.multiplayer ){
      ctx.game.ai.setTarget(ctx.game.world.opponent.paddle);

    // multiplayer
    } else {
      ctx.network.on('message',inputs.onmessage)
      inputs.on('message',function(buf){ctx.network.send(buf)})

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
    keys.bind(['esc','space'], pause)
    $('button.pause').on('click', pause)
    this.timeout = setTimeout(function(){
      inputs.resume()
      inputs.record(inputs.PLAY)
    }, 952.38)

    function pause(){
      inputs.record(inputs.PAUSE)
    }
  },

  leave: function(ctx){
    keys.unbind(['esc','space'])
    $('button.pause').off('click')
  },

  cleanup: function(){
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
      keys.bind('space', resume)
      keys.bind('esc', see.bind('/main-menu'))
      $('button.play').on('click',resume)
    }, 1000);

    function resume(){
      console.log('RESUMING GAME')
      inputs.record(inputs.RESUME)
      inputs.resume()
    }
  },
  leave: function(ctx){
    clearTimeout(this.timeout);
    keys.unbind('space')
    keys.unbind('esc')
    $('button.play, .main-menu',ctx.el).off('click')
    dmaf.tell("unpause")
  }
}

exports.Next = {

  enter: function(ctx){
    var world = ctx.game.world;

    ctx.game.ai.stop();

    debug('%s round over',world.frame)

    var frame = world.frame;

    // get last hit player before reset
    var lastHit = world.lastHit;

    // hides everything a bit early for know
    ctx.game.reset()
    resetExtraIcons();
    ctx.renderer.triggerEvent("resetPaddles");

    // pause network input until start
    inputs.pause()
    ctx.network.off('message',inputs.onmessage);

    // round over when someone reaches 3
    var maxBalls = 3; // TODO setting?
    var roundOver = world.me.score >= maxBalls || world.opponent.score >= maxBalls;
    var winner = world.me.score > world.opponent.score ? world.me : world.opponent;

    // round is automatically over when deathballed
    if( world.state === World.DEATH_BALL ){
      roundOver = true;
      // TODO winner? whoever didn't take the deathball?
    }

    updateScores(world);

    _gaq.push(['_trackEvent', (ctx.multiplayer)?'2p':'1p', (roundOver)?'game over':'round', frame ]);

    // multiplayer
    if( ctx.multiplayer ){

      // copy the scores to sync
      // so the replays won't break
      var sync = ctx.sync.world;
      sync.players.a.score = world.players.a.score;
      sync.players.b.score = world.players.b.score;

      if( winner === world.me ){
        dmaf.tell('user_won_match')
        $('.state.game-prompt-over h4.win').show().siblings().hide();
      } else {
        dmaf.tell('user_lost_match')
        $('.state.game-prompt-over h4.loose').show().siblings().hide();
      }

      // round over = game over!
      if( roundOver ){
        debug('multiplayer game over')
        winner.wins += 1;
        sync.players.b.wins = world.players.a.wins;
        sync.players.a.wins = world.players.b.wins;

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
      if( roundOver && winner === world.opponent ){
        debug('singleplayer game over')
        dmaf.tell('user_lost_match')
        world.setState(World.GAME_OVER)
        ctx.renderer.triggerEvent("gameOver")
        see('/game/prompt/over')

      // round over + me winner = level up!
      } else if( roundOver && winner === world.me ){
        debug('singleplayer level up!')
        dmaf.tell('user_won_match')
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
          },4000)
        },4000)

      // next round!
      } else {
        debug('singleplayer next round!')

        if( lastHit === world.opponent ){
          dmaf.tell('user_lost_round');
        }
        else {
          dmaf.tell('user_won_round');
        }

        ctx.renderer.triggerEvent("roundOver");
        world.setState(World.NEXT_ROUND)

        clearTimeout(this.nextRoundTimeout)
        this.nextRoundTimeout = setTimeout(function(){
          dmaf.tell('countdown_init')
          ctx.renderer.triggerEvent("startCountDown");
          clearTimeout(this.nextRoundTimeout)
          this.nextRoundTimeout = setTimeout(function(){
            //dmaf.tell('countdown_short')
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

    // reset inputs (mostly for when we won't restart)
    inputs.reset()

    // stop sending messages to the network
    // (will start again in /game/start)
    inputs.off('message')

    // give some time for the bear to dance etc...
    this.nextTimeout = setTimeout(next,500)
  },

  cleanup: function(ctx){
    clearTimeout(this.nextTimeout);
  }

}


exports.Over = {
  enter: function(ctx){

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

      _gaq.push(['_trackEvent', 'button','restarted ' + (settings.replayed++) + ' times' ]);

      ctx.renderer.triggerEvent("restart");
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
    ctx.game.reset();
    ctx.game.world.players.a.reset(true);
    ctx.game.world.players.b.reset(true);
    updateScores(ctx.game.world);

    // reset the sync world to match the
    // game one
    // (seeing if moving this to game.Start is a good idea)
    // if( ctx.sync ){
    //   ctx.sync.world.copy(ctx.game.world);
    // }

    keys.unbind('space')
    $('.main-menu',ctx.el).on('click')
  }
}

function waitFor(ctx,path,then){
  debug('  waiting for %s -> %s',path,then)
  if( ctx.network.pathname === path ){
    see(then)
    return null;

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

function startGame(game,local,preview){
  // ctx.sync is not available in mobile
  // console.error('startGame', game, local, withPuck)
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

  _gaq.push(['_trackEvent', (ctx.multiplayer)?'2p':'1p', 'level ' + (level+1), (level+1) ]);

  // update theme
  actions.emit('renderer','changeLevel',{level: level})
}


function showExtraIcon(type){
  var el = $('#extras .'+type).show()
    , y = ($('#extras .visible').length) * 52;
    if( el.hasClass('visible') )
      return;
    el.css('top', y).addClass('visible');
}

function hideExtraIcon(type){
  var el = $('#extras .'+type).removeClass('visible active');
  $('#extras .visible').each( function(index){
    $(this).css('top', index*52);
  })
}

function activateExtraIcon(type){
  var el = $('#extras .'+type).addClass('visible active');
}

function resetExtraIcons() {
  $('#extras li').removeClass('visible active');
}

function infoComplete(ctx){
  $('#scores').fadeIn(500);
  if( ctx.multiplayer )
    see('/game/wait')
  else
    see('/game/prompt/level')
}

function verifyHashes(ctx){
  var hashes = {}
    , jsons = {};

  keys.bind('.',function(){
    ctx.network.remote.signal.send({type:'hashes',hashes: hashes})
  })

  ctx.network.remote.on('hashes',function(e){
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
        console.log(' hashes does not match, sending json of world to compare')
        ctx.network.remote.signal.send({type:'world',frame: frame,world: jsons[frame]})
        actions.gamePause(ctx.game.world)
        misMatch = frame;
        break;
      }
    }
    console.groupEnd('comparing hashes')
    if( misMatch !== null ){
      console.error('hashes did not match at %s',misMatch)
    }
  })

  ctx.network.remote.on('world',function(e){
    console.group('comparing worlds at frame %s',e.frame)
    if( jsons[e.frame] !== e.world ){
      console.log('NOT THE SAME, trying diff:')
      console.log(diff.createPatch('diff for frame '+e.frame,jsons[e.frame],e.world,'local','remote'))
      console.log('remote',[JSON.parse(e.world)])
      console.log('local',[JSON.parse(jsons[e.frame])])
      actions.gamePause(ctx.game.world)
    }
    console.groupEnd('comparing worlds at frame %s',e.frame)
  })

  ctx.sync.on('post update',function logHashCode(world){
    // hash and store without me/opponent/name
    hashes[world.frame] = world.code()
    jsons[world.frame] = JSON.stringify(world,unhide,2)
  })

  // used as JSON replacer to
  // find undefined values
  function unhide(k,v){
    if( typeof v == 'undefined' )
      return 'undefined'
    return v;
  }
}
