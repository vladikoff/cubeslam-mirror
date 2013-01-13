var settings = require('../settings')
  , Body = require('../geom-sim/body')
  , shapes = require('../geom-sim/shapes')
  , AI = require('../ai')
  , Puppeteer = require('../puppeteer')
  , Editor = require('../level-editor')
  , see = require('../support/see')
  , inputs = require('mousetrap')
  , geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec
  , $ = require('jquery');

exports.Setup = {
  enter: function(ctx){
    setupGame(ctx)
    createGame(ctx)
    ctx.game.actions.gameResume()
  },
  leave: function(ctx){}
}


exports.Information = {
  enter: function(ctx){
    ctx.renderer.changeView("play");

    var info = $('.state.game-info');
    this.play = info.find(".play").show()
    this.play.on('click',function(){ see('/game/play') });
    inputs.bind('space', function(){ see('/game/play') });
  },

  leave: function(ctx){
    this.play.off('click');
    inputs.unbind('space');
  }
}


exports.Waiting = {
  enter: function(ctx){},
  leave: function(ctx){}
}


exports.Play = {
  enter: function(ctx){
    // just in case we're not already here...
    ctx.renderer.changeView("play");

    // singleplayer
    if( !ctx.multiplayer ){
      this.ai = new AI(settings.data.arenaWidth/2,0);
      $("#scoresSingleplayer").show();
      $("#scoresMultiplayer").hide();

    // multiplayer
    } else {
      // debug multiplayer AI
      if( ~window.location.href.indexOf('ai') ){
        this.ai = new AI(settings.data.arenaWidth/2,settings.data.arenaHeight);
      }

      ctx.renderer.swapToVideoTexture();
      $("#scoresMultiplayer").show();
      $("#scoresSingleplayer").hide();
    }

    var el = $('.countdown')
      , newone = el.clone(true);
    el.before(newone);
    $("." + el.attr("class") + ":last").remove();
    $("#countdown-cover").show().css({opacity:0}).animate({opacity:0.3},800)

    var countdown = function(nr) {
      if (nr > 0) {
        this.timeout = setTimeout(countdown, 1000, nr-1);
      } else {
        $("#countdown-cover").fadeOut()
        $("#gameScores").removeClass('inactive').addClass('active')
        inputs.bind(['esc','space'], function(){ see('/game/pause') })
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
    inputs.unbind('esc')
    inputs.unbind('space')
  }
}


exports.Pause = {
  enter: function(ctx){},
  leave: function(ctx){}
}


exports.Over = {
  enter: function(ctx){},
  leave: function(ctx){}
}

function setupGame(ctx){
  var game = ctx.game;

  if( ctx.puppeteer )
    return;

  // the puppeteer takes care of the levels
  ctx.puppeteer = new Puppeteer()
  ctx.editor = new Editor(ctx.puppeteer)
  ctx.puppeteer.on('added',function(level){
    // adds the level to the level editor
    ctx.editor.add(level)
  })
  ctx.puppeteer.on('change',function(level){
    // keep a reference to the current level in world
    // (it's just easier in actions.js this way)
    game.world.level = this.levels[level]
    settings.changeTheme(game.world.level.theme)

    $("#level").html(level+1);

    // TODO restart game
  })

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

  ctx.puppeteer.on('update', ctx.multiplayer ? multiplayer : singleplayer)

  ctx.puppeteer.on('game over',function(level){
    $("#highscoreLevels").html( ctx.puppeteer.level+1 )
    ctx.renderer.triggerEvent("gameOver");
    see('/game/over')
  })
  ctx.puppeteer.add(require('../levels/level1'));
  ctx.puppeteer.add(require('../levels/level2'));
  ctx.puppeteer.add(require('../levels/level3'));
  ctx.puppeteer.add(require('../levels/level4'));
  ctx.puppeteer.add(require('../levels/level5'));
  ctx.puppeteer.add(require('../levels/level6'));
  ctx.puppeteer.add(require('../levels/level7'));
  ctx.puppeteer.add(require('../levels/level8'));

  // debug shortcut
  var RE_DBG_LEVEL = /[&?]level=(\d+)/g;
  if( RE_DBG_LEVEL.exec(window.location.href) ){
    var level = parseInt(RegExp.$1)-1;
    console.log('DEBUG LEVEL',level)
    ctx.puppeteer.goto(level)
  } else {
    ctx.puppeteer.goto(0)
  }
}

function createGame(ctx){
  var world = ctx.game.world
    , g = ctx.game
    , w = (settings.data.arenaWidth/settings.data.arenaColumns*4)/settings.data.arenaWidth;

  // create paddles
  world.players.a.paddle = createPaddle(world, 0, .5, 1, w, .08); // 0 means "top" (i.e. height*0)
  world.players.b.paddle = createPaddle(world, 1, .5, 0, w, .08); // 1 means "bottom" (i.e. height*1)

  // easy player access
  world.me = world.host ? world.players.a : world.players.b;
  world.opponent = world.host ? world.players.b : world.players.a;

  // add a puck to the center of the arena
  // TODO move to a /game/setup state?
  createPuck(world,g.actions)

  // keyboard controls
  var paddle = world.paddles.get(world.me.paddle)
    , isLeft = false
    , isRight = false
    , force = 10000;

  ctx.game.on('frame',function(world){
    isLeft && g.actions.paddlePush(world.me.paddle, -force, 0)
    isRight && g.actions.paddlePush(world.me.paddle, force, 0)
  })

  inputs.bind('right',function(){ isRight = true },'keydown')
  inputs.bind('right',function(){ isRight = false },'keyup')
  inputs.bind('left',function(){ isLeft = true },'keydown')
  inputs.bind('left',function(){ isLeft = false },'keyup')
  inputs.bind('up',function(){ createBullet(world,g.actions) })

  // TODO mouse
  if( 0 ){
    var x = ctx.renderer.getWorldCoordinate(inputs.mouse.x*2-1,inputs.mouse.y*-2+1);
    x /= settings.data.arenaWidth
    x += .5
    g.actions.paddleMove(world.me.paddle, x);
  }

  // TODO let it slide
  if( 0 ){
    var speed = world.keyboardSpeed * damp;
    if( Math.abs(speed) > 1 ) {
      var x = world.paddles.get(world.me.paddle).current[0] + (world.host ? speed : -speed);
      x /= settings.data.arenaWidth
      g.actions.paddleMove(world.me.paddle, x);
    }
    world.keyboardSpeed = speed;
  }
}


function createPuck(world,actions){
  // add to center of arena
  var id = 'p:' + world.puckIndex++
    , x = settings.data.arenaWidth/2
    , y = settings.data.arenaHeight/2
    , mass = 5;
  actions.puckCreate(id,x,y,mass,Body.DYNAMIC | Body.BOUNCE);

  // start it off with a push
  // TODO change the initial direction depending on who lost?
  actions.puckSpeed(id, 0, world.level.speed)
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

function createPaddle(world,id,x,y,w,h){
  var aw = settings.data.arenaWidth
  var ah = settings.data.arenaHeight
  var paddle = new Body(shapes.rect(w*aw,settings.data.puckRadius*6),x*aw,y*ah,Body.DYNAMIC | Body.BOUNCE | Body.STEER)
  paddle.id = id;
  paddle.damping = settings.data.paddleDamping;
  paddle.mass = settings.data.paddleMass;
  paddle.onbounds = function(b){
    // offset b to avoid intersection
    vec.add(paddle.current, b, paddle.current)

    // reset velocity by settings previous to current
    vec.copy(paddle.current, paddle.previous)
  }
  world.bodies.set(id,paddle);
  world.paddles.set(id,paddle);
  console.log('created paddle',w*aw,h*ah,x*aw,y*ah)
  return id;
}