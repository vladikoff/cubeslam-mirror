var debug = require('debug')('states:game')
  , settings = require('../settings')
  , see = require('../support/see')
  , mouse = require('../support/mouse')
  , keys = require('mousetrap')
  , World = require('../world')
  , inputs = require('../inp')
  , Renderer = require('../renderer-2d')
  , actions = require('../actions')
  , Game = require('../game')
  , diff = require('../support/diff')
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

var EPS = 1e-6;
function eps(x){ return Math.round(x/EPS) * EPS }

exports.Setup = {
  enter: function(ctx){
    debug('setup enter')

    if( ctx.multiplayer ){
      // create a network game
      var renderer = null;//new Renderer(document.getElementById('canv-db'));
      ctx.sync = new Game('sync',renderer);
      inputs.context(ctx);

      if( ctx.query.verify ){
        verifyHashes(ctx);
      }
    }

    // set the active player in the renderer
    ctx.renderer.activePlayer(ctx.network.winner ? 1 : 0, false, ctx.multiplayer)

    // invert the controls for the "other" player
    settings.data.invertControls = ctx.network.winner;

    setupLevels(ctx,ctx.game)
    setupLevels(ctx,ctx.sync)

    $('#scores').fadeOut(0);

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
      if( ctx.multiplayer ){
        if( world.name == 'sync' ){
          inputs.record(World.OVER)
          inputs.pause()
        } else {
          // pause? and continue in case sync
          // doesn't agree? how can we know?
        }
      } else {
        see('/game/next')

      }
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
        case '/game/prompt/over':
          if( ctx.pathname === '/game/play' )
            see('/game/prompt/over');
          break;
      }
    }
    if( ctx.multiplayer ){
      ctx.network.on('change pathname',this.pathnameChange)
      ctx.network.on('disconnected',this.disconnected)
      actions.on('round over',this.roundOver)

    } else {
      actions.on('round over',this.roundOver)
    }

    var game = ctx.game
      , world = game.world
      , isLeft = 0
      , isRight = 0;

    this.update = function(world,timestep){
      // only while debugging
      if( ctx.sync )
        $('#scores .frame').html('l: '+ctx.game.world.frame+' n: '+ctx.sync.world.frame)
      if( world.state !== World.PREVIEW && world.state !== World.PLAYING  && world.state !== World.OVER )
        return;
      var dir = settings.data.invertControls ? -1 : 1
      isLeft  && inputs.record(World.MOVE,world.me.paddle,eps(-settings.data.keyboardSensitivity*10*dir));
      isRight && inputs.record(World.MOVE,world.me.paddle,eps(+settings.data.keyboardSensitivity*10*dir));
      if(ctx.touch)
        mouse.tick() // will emit 'move' or 'click'
    }
    game.on('pre update',this.update)

    mouse.on('move',function(dx,dy,dt){
      var dir = settings.data.invertControls ? -1 : 1
      inputs.record(World.MOVE,world.me.paddle,dx * settings.data.mouseSensitivity*dir)
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

    ctx.network.off('change pathname',this.pathnameChange)
    ctx.network.off('disconnected',this.disconnected)

    actions.off('round over')
    ctx.game.off('pre update',this.update)
    keys.unbind('right','keyup')
    keys.unbind('right','keydown')
    keys.unbind('left','keyup')
    keys.unbind('left','keydown')
    keys.unbind('up')

    if(ctx.touch) {
      mouse.off('click')
      mouse.off('move')
      mouse.stop()
    }
  }
}


exports.Instructions = {
  enter: function(ctx){
    debug('information enter')

    dmaf.tell('info_screen')

    startGame(ctx.game,!ctx.network.winner)
    startGame(ctx.sync,ctx.network.winner)
    ctx.game.world.setState(World.PREVIEW)

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
      clearTimeout(self.gameStartTimeout);
      self.gameStartTimeout = setTimeout(function(){
        infoComplete(ctx)
      }, 5000);
    })
    keys.bind('space', function(){ $('.play',ctx.el).click() });

    if(ctx.mobile){
      this.play.click();
    }

    // autonavigate while testing multiplayer
    if( ctx.query.autonav || ctx.query.play){
      infoComplete(ctx)
    }
  },

  leave: function(ctx, next){
    debug('information leave')
    if( this.gameStartTimeout )
      clearTimeout( this.gameStartTimeout );
    this.gameStartTimeout = null;

    this.play.off('click');
    keys.unbind('space');

    $("#scores .singleplayer").toggle(!ctx.multiplayer);
    $("#scores .multiplayer").toggle(!!ctx.multiplayer);

    $(ctx.el).removeClass('active').addClass('inactive')
    setTimeout(next, 1000)

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
    startGame(ctx.game,!ctx.network.winner,1)
    startGame(ctx.sync,ctx.network.winner,1)

    // show scores
    updateScores(ctx.game.world)

    // reset inputs
    inputs.reset()
    inputs.resume()

    // AI
    // singleplayer
    if( !ctx.multiplayer ){
      ctx.game.ai.setTarget(ctx.game.world.opponent.paddle);
      if( ctx.sync ){
        ctx.sync.ai.setTarget(ctx.sync.world.opponent.paddle);
      }

    // multiplayer
    } else {
      // start network input
      ctx.network.on('message',inputs.onmessage)
      inputs.on('message',function(buf){ctx.network.send(buf)})

      // debug multiplayer AI
      if( ctx.query.ai ){
        ctx.game.ai.setTarget(ctx.sync.world.me.paddle);
      }
    }

    see('/game/play')
  },

  leave: function(ctx){
    ctx.renderer.changeView("play");
  }

}

exports.Play = {
  enter: function(ctx){
    dmaf.tell('game_screen');
    ctx.renderer.triggerEvent("gameStart");
    $('.game-play').removeClass('active');
    keys.bind(['esc','space'], function(){ see('/game/pause') })
    $('button.pause').on('click', function(){ see('/game/pause') })
    inputs.record(World.PLAY)
  },


  leave: function(ctx){
    keys.unbind('esc')
    keys.unbind('space')
    $('button.pause').off('click')
    //Adding pause mechanism when leaving play
    //needed for friend arrive state
    inputs.record(World.PAUSE)
    inputs.pause()
  }
}


exports.Pause = {
  enter: function(ctx){
    inputs.record(World.PAUSE)
    inputs.pause()
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
    inputs.resume()
    keys.unbind('space')
    $('.play-friend',ctx.el).off('click');
    $('button.play').off('click');
  }
}

exports.Next = {

  enter: function(ctx){
    var world = ctx.game.world;

    // console.log('%s round over',world.frame, )
    debug('%s round over',world.frame)

    //get last hit player before reset
    var lastHit = world.lastHit;

    //hides everything a bit early for know
    ctx.game.reset()

    // pause network input until start
    inputs.pause()
    ctx.network.off('message',inputs.onmessage);

    // round over when someone reaches 3
    var roundOver = world.me.score === 3 || world.opponent.score === 3;
    var winner = world.me.score > world.opponent.score ? world.me : world.opponent;

    if( lastHit === world.opponent ) {
      dmaf.tell('opponent_score_hit');
      console.log( 'opponent hit' );
    }
    else {
      dmaf.tell('user_score_hit');
      console.log( 'im hit' );
    }

    updateScores(ctx.game.world);

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

        world.setState(World.GAME_OVER)
        ctx.renderer.triggerEvent("gameOver");
        waitFor(ctx,'/game/next','/game/prompt/over');

      // next round!
      } else {
        debug('multiplayer next round!')
        dmaf.tell('countdown_short')
        world.setState(World.NEXT_ROUND)
        ctx.renderer.triggerEvent("roundOver");
        waitFor(ctx,'/game/next','/game/prompt/round')

      }

    // singleplayer
    } else {
      //  round over + opponent winner = game over!
      if( roundOver && winner === world.opponent ){
        debug('singleplayer game over')
        dmaf.tell('user_lost_match')
        
        world.setState(World.GAME_OVER)
        ctx.renderer.triggerEvent("gameOver")
        return see('/game/prompt/over')

      // round over + me winner = level up!
      } else if( roundOver && winner === world.me ){
        debug('singleplayer level up!')

        dmaf.tell('user_won_match')
        world.setState(World.NEXT_LEVEL)

        setTimeout(function(){
          
          world.players.a.reset(true);
          world.players.b.reset(true);
          
          ctx.renderer.triggerEvent("levelUp");
          ctx.game.puppeteer.up();

          setTimeout(function(){
            see('/game/prompt/level');
          },4000)
        },4000)
        return;


      // next round!
      } else {

        debug('singleplayer next round!', lastHit)

        if( lastHit === world.opponent ) {
          dmaf.tell('user_lost_round');
        }
        else {
          dmaf.tell('user_won_round');
        }

        ctx.renderer.triggerEvent("roundOver");
        world.setState(World.NEXT_ROUND)

         setTimeout(function(){
          dmaf.tell('countdown_init')
          setTimeout(function(){
            //dmaf.tell('countdown_short')
            see('/game/prompt/round')
          },952.38)
         },2000);

        return

      }
    }
  },


  leave: function(ctx,next){
    
    // updating the scores
    updateScores(ctx.game.world)

    // reset inputs (mostly for when we won't restart)
    inputs.reset()

    // stop sending messages to the network
    // (will start again in /game/start)
    inputs.off('message')

    // give some time for the bear to dance etc...
    setTimeout(next,500)
  }

}


exports.Over = {
  enter: function(ctx){

    dmaf.tell('gameover_screen');

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
        $('#scores').fadeIn(500);
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
    ctx.game.reset();
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
  // ctx.sync is not available in mobile
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
  debug('update scores %s %s - %s',world.name,world.players.a.score,world.players.b.score)
  $('#scores li').addClass('active')


  $('#scores .singleplayer .player li').slice(world.me.score).removeClass('active latest-winner');
  $('#scores .singleplayer .opponent li').slice(world.opponent.score).removeClass('active latest-winner');
  $('#scores .multiplayer .player li').slice(world.me.score).removeClass('active latest-winner');
  $('#scores .multiplayer .opponent li').slice(world.opponent.score).removeClass('active latest-winner');
}

function setupLevels(ctx,game){
  // ctx.sync is not available in mobile
  if( !game ) return;
  game.puppeteer.on('change',function(level){
    // keep a reference to the current level in world
    // (it's just easier in the actions this way)
    game.world.level = this.levels[level]

    // restart game
    //adds start class for transition delay purposes
    $("#level-prompt h2 span")
      .html(level+1)
      .closest('section')
      .toggleClass('start', level==0);
    $("#level").html(level+1);
    dmaf.tell('level_'+level);
  })



  // debug shortcut
  var startLevel = 0;
  if( ctx.query.level ){
    startLevel = parseInt(ctx.query.level)-1;
    console.log('DEBUG LEVEL',startLevel)
  }
  game.puppeteer.goto(startLevel)
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
