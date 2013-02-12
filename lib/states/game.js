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
  , Game = require('../game')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , $ = require('jquery');


exports.Setup = {
  enter: function(ctx){
    debug('setup enter')

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

      NetworkInputs.start(ctx)
      ctx.network.on('disconnected',this.disconnected)

    } else {
      console.log('60FPS')
      Game.TIMESTEP = 1/60;
      actions.on('round over',this.roundOver)
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
    // mouse.on('click',function(x,y,dt){ game.emit('input',World.SHOOT,world.me.paddle); })
    mouse.start(document.getElementById('game'))
  },

  leave: function(ctx){
    $('#scores').hide()
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
    mouse.off('click')
    mouse.off('move')
    mouse.stop()

  }
}


exports.Information = {
  enter: function(ctx){
    debug('information enter')
    startGame(ctx.game,!ctx.network.winner)
    startGame(ctx.networkGame,ctx.network.winner)

    ctx.game.emit('input',World.PLAY)
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
      keys.bind('space', function(){ see('/game/start') });
      clearTimeout(self.gameStartTimeout);
      self.gameStartTimeout = setTimeout(function(){
        see('/game/start')
      }, 5000);

    })
    keys.bind('space', function(){ $('.play',ctx.el).click() });


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
    debug('information leave')
    if( this.gameStartTimeout )
      clearTimeout( this.gameStartTimeout );
    this.gameStartTimeout = null;

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
    $('#level-prompt').fadeOut(0)
    $('#round-prompt').fadeOut(0)

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

  leave: function(ctx,next){
    $('#round-prompt')
      .delay(300)
      .fadeIn(300)
      .delay(1000)
      .fadeOut({duration: 300, complete:function(){
        next()
      }});
  }

}

exports.Play = {
  enter: function(ctx){
    // just in case we're not already here...
    ctx.renderer.changeView("play");
    $('#scores').show()
    $('#start-prompt').fadeOut(0)

    var start = function() {
      $('#start-prompt')
        .fadeIn(300)
        .delay(1000)
        .fadeOut({duration: 300, complete:function(){
        $('.game-play').removeClass('active');
        // $('.countdown-number.visible').removeClass('visible')
        keys.bind(['esc','space'], function(){ see('/game/pause') })
        ctx.game.emit('input',World.PLAY)
      }})
    }.bind(this)

    // wait until we're in play view
    clearTimeout(this.timeout);
    var offset = ctx.latency || 0;
    this.timeout = setTimeout(function(){
      start()
    }, 1000 - offset);

    // TODO refactor this
    ctx.game.world.runLevels = true;
    if( ctx.networkGame )
      ctx.networkGame.world.runLevels = true;
  },


  leave: function(ctx){
    clearTimeout(this.timeout);
    keys.unbind('esc')
    keys.unbind('space')
    ctx.game.emit('input',World.PAUSE)

    // TODO refactor this
    ctx.game.world.runLevels = false;
    if( ctx.networkGame )
      ctx.networkGame.world.runLevels = false;
  }
}


exports.Pause = {
  enter: function(ctx){
    $('.play-friend',ctx.el)
      .toggle(!ctx.multiplayer) // hidden if we already play in multiplayer
      .on('click',function(){ see('/game/invite') })

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

        // wait for other player
        waitFor(ctx,'/game/next','/game/over')

      // next round!
      } else {
        console.log('multiplayer next round!')
        debug('multiplayer next round!')

        // explicitly setting this to false
        // so scores won't reset. it will always
        // be set to true until here since it's
        // used by the network inputs to avoid
        // processing inputs after the game should
        // be over.
        // TODO probably use two separate properties?
        world.over = false;

        waitFor(ctx,'/game/next','/game/start')

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

    if(!ctx.multiplayer)
      $('#single-levels').text(ctx.game.puppeteer.level+1);
    else {
      $('#single-levels').text(ctx.game.puppeteer.level+1);
    }


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

  if( !game.running )
    game.update()

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
    settings.changeTheme(game.world.level.theme)

    // restart game
    if( !game.replaying && ctx.pathname == '/game/next' ) {
      console.log('hello world')
      $("#level-prompt h2 span").html(level+1);
    }

    $("#level").html(level+1);
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


// -// [frame,type,args...,frame,type,args...]
// -var localQueue = []
// -  , networkQueue = []
// -
// -function networkInput(ctx){
// -  var network = ctx.network;
// -
// -  keys.bind('f',function(){
// -    forward(ctx.networkGame,ctx.game.world.frame)
// -  })
// -
// -  keys.bind('i',function(){
// -    network.remote.signal.send({
// -      type:'inputhash',
// -      hashcode: ctx.networkGame.inputs.hashCode()
// -    })
// -  })
// -  network.remote.on('inputhash',function(e){
// -    console.log('inputhash')
// -    console.log(' remote:',e.hashcode)
// -    console.log('  local:',ctx.networkGame.inputs.hashCode())
// -    // if( e.hashcode !== ctx.networkGame.world.hashCode() )
// -    //   throw new Error('out of sync :(')
// -    // TODO pause/warn and run a full replay
// -  })
// -
// -  keys.bind('h',function(){
// -    network.remote.signal.send({
// -      type:'hashcode',
// -      hashcode: ctx.networkGame.world.hashCode()
// -    })
// -  })
// -  network.remote.on('hashcode',function(e){
// -    console.log('hashcode')
// -    console.log(' remote:',e.hashcode)
// -    console.log('  local:',ctx.networkGame.world.hashCode())
// -    // if( e.hashcode !== ctx.networkGame.world.hashCode() )
// -    //   throw new Error('out of sync :(')
// -    // TODO pause/warn and run a full replay
// -  })
// -
// -  // a test which should restart from the beginning
// -  // (it shouldn't really be noticed)
// -  keys.bind('r',function(){
// -    replay()
// -  })
// -  keys.bind('t',function(){
// -    network.remote.signal.send({type:'replay'})
// -  })
// -  network.remote.on('replay',function(){
// -    replay();
// -  })
// -
// -
// -  ctx.game.on('post update',function(){
// -    $('#scores .frame').html('l: '+ctx.game.world.frame+' n: '+ctx.networkGame.world.frame)
// -    network.game.flush()
// -  })
// -
// -  // if( !network.winner ){
// -  //   setInterval(function(){
// -  //     // test to run some input
// -  //     ctx.game.emit('input',World.MOVE,ctx.game.world.me.paddle,1)
// -  //   },200)
// -  // } else {
// -  //   setInterval(function(){
// -  //     // test to run some input
// -  //     ctx.game.emit('input',World.MOVE,ctx.game.world.me.paddle,-2)
// -  //   },500)
// -  // }
// -
// -  // setInterval(replay,1000)
// -
// -  keys.bind(',',function(){
// -    var diff = actions.debugDiff(ctx.game.world);
// -    console.log(diff)
// -  })
// -
// -  keys.bind('c',function(){
// -    var diff = actions.debugDiff(ctx.networkGame.world);
// -    network.remote.signal.send({type:'diff',diff: diff})
// -  })
// -
// -  network.remote.on('diff',function(e){
// -    actions.debugDiff(ctx.networkGame.world,e.diff)
// -  })
// -
// -  // sending input
// -  ctx.game.on('apply',function(world,inputs,size){
// -    if( !size ) return;
// -    if( this.replaying ) return;
// -    var buf = new ArrayBuffer(2+size);
// -    var data = new buffer.Writer(buf);
// -    data.setUint16(world.frame);
// -    for(var i=0; i < inputs.length;) {
// -      var type = inputs[i++];
// -      data.setInt8(type);
// -      switch(type){
// -        case World.MOVE:
// -          var p = inputs[i++];
// -          var x = inputs[i++];
// -          data.setUint8(p);
// -          data.setFloat32(x);
// -          debug('%s local move',world.frame,p,x)
// -          localQueue.push(world.frame,type,p,x)
// -          break;
// -        case World.SHOOT:
// -          var p = inputs[i++];
// -          data.setUint8(p);
// -          debug('%s local shoot',world.frame,p)
// -          localQueue.push(world.frame,type,p)
// -          break;
// -        case World.PAUSE:
// -          debug('%s local pause',world.frame)
// -          localQueue.push(world.frame,type)
// -          break;
// -        case World.PLAY:
// -          debug('%s local play',world.frame)
// -          localQueue.push(world.frame,type)
// -          break;
// -        case World.OVER:
// -          debug('%s local over',world.frame)
// -          localQueue.push(world.frame,type)
// -          break;
// -        default:
// -          console.error('unknown type',type)
// -          return null;
// -      }
// -    }
// -    network.send(buf);
// -
// -    forward(ctx.networkGame,world.frame) && replay()
// -  })
// -
// -  // prebuild an ACK packet
// -  var ack = new ArrayBuffer(3);
// -  var ackData = new DataView(ack);
// -  ackData.setInt8(2,World.ACK);
// -
// -  // receiving input
// -  network.on('message',function(buf){
// -    var data = new buffer.Reader(buf);
// -    var frame = data.getUint16()
// -    var sendAck = true;
// -
// -    while(data.offset < buf.byteLength){
// -      var type = data.getInt8();
// -      switch(type){
// -        case World.ACK:
// -          debug('%s ack',frame)
// -          sendAck = false
// -          break;
// -        case World.MOVE:
// -          var p = data.getUint8();
// -          var x = data.getFloat32();
// -          debug('%s network move',frame,p,x)
// -          networkQueue.push(frame,type,p,x)
// -          break;
// -        case World.SHOOT:
// -          var p = data.getUint8();
// -          debug('%s network shoot',frame,p)
// -          networkQueue.push(frame,type,p)
// -          break;
// -        case World.PAUSE:
// -          debug('%s network pause',frame)
// -          // networkQueue.push(frame,type)
// -          break;
// -        case World.PLAY:
// -          debug('%s network play',frame)
// -          // networkQueue.push(frame,type)
// -          break;
// -        case World.OVER:
// -          debug('%s network over',frame)
// -          // networkQueue.push(frame,type)
// -          break;
// -        default:
// -          console.error('invalid network input')
// -          return false;
// -      }
// -    }
// -
// -    forward(ctx.networkGame,frame) && replay()
// -  })
// -
// -  function replay(){
// -    replay2(ctx.networkGame,ctx.game,localQueue.concat(),networkQueue.concat())
// -  }
// -}
// -
// -function forward(game,frame){
// -  // console.log('forward to',frame)
// -  // update the networkGame with both
// -  // local and network input until it's
// -  // `world.frame == frame`
// -  if( !networkQueue.length ){
// -    debug('skipping forwarding, no network events');
// -    return false;
// -  }
// -
// -  debug('forwarding %s to %s',game.world.frame,frame)
// -  // console.log('  l:',localQueue)
// -  // console.log('  n:',networkQueue)
// -
// -  var fwd = false;
// -  var steps = frame - game.world.frame;
// -  for(var i=0; i < steps; i++ ){
// -    // check if there's any queued local inputs to
// -    // be applied.
// -    fwd = true;
// -    checkQueue('l',localQueue,game)
// -    checkQueue('n',networkQueue,game)
// -    game.update();
// -  }
// -  if( fwd ){
// -    debug('forwarded %s to %s',game.world.name,game.world.frame)
// -    // console.log('  l:',localQueue)
// -    // console.log('  n:',networkQueue)
// -  } else {
// -    debug('  no forwarding n: %s l: %s',networkQueue[0],frame)
// -  }
// -  return fwd;
// -}
// -
// -function replay2(fromGame,toGame,localQueue,networkQueue){
// -  var steps = toGame.world.frame - fromGame.world.frame;
// -
// -  debug('replaying %s to %s',fromGame.world.frame,toGame.world.frame)
// -  // console.log('  l:',localQueue)
// -  // console.log('  n:',networkQueue)
// -
// -  toGame.replaying = true;
// -  settings.data.sounds = false;
// -  toGame.world.copy(fromGame.world);
// -  toGame.inputs.copy(fromGame.inputs);
// -
// -  for(var i=0; i < steps; i++){
// -    checkQueue('l',localQueue,toGame)
// -    checkQueue('n',networkQueue,toGame)
// -    toGame.update();
// -  }
// -  debug('replayed %s to %s',toGame.world.name,toGame.world.frame)
// -  // console.log('  l:',localQueue)
// -  // console.log('  n:',networkQueue)
// -  toGame.replaying = false;
// -}
// -
// -function checkQueue(name,q,game){
// -  // console.log('check %s queue %s == %s?',name,q[0],game.world.frame)
// -  while( q[0] === game.world.frame ){
// -    var frame = q.shift()
// -      , type = q.shift();
// -    switch(type){
// -      case World.MOVE:
// -        var p = q.shift();
// -        var x = q.shift();
// -        debug('%s queued move',frame,p,x)
// -        game.emit('input',type,p,x)
// -        break;
// -      case World.SHOOT:
// -        var p = q.shift();
// -        debug('%s queued shoot',frame,p)
// -        game.emit('input',type,p)
// -        break;
// -      case World.PAUSE:
// -        debug('%s queued pause',frame)
// -        game.emit('input',type)
// -        break;
// -      case World.PLAY:
// -        debug('%s queued play',frame)
// -        game.emit('input',type)
// -        break;
// -      case World.OVER:
// -        debug('%s queued over',frame)
// -        game.emit('input',type)
// -        break;
// -      default:
// -        console.error('unknown type in queue',type)
// -    }
// -  }
// -}
