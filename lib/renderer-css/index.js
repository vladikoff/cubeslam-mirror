var debug = require('debug')('renderer:css')
  , settings = require('../settings')
  , actions = require('../actions')
  , stash = require('stash')
  , cssEvent = require('css-emitter')
  // , Paddle = require('../actions/paddle')
  , World = require('../world')
  , Bear = require('./bear')
  , Shield = require('./shield')
  , Paddle = require('./paddle')
  , Puck = require('./puck')
  , Extra = require('./extra')
  , Effects = require('./effects')
  , $ = require('jquery');

module.exports = Renderer;

function Renderer(element){
  this.element = element;

  this.width = 768;
  this.height = 1024;

  this.arenaScaleW = this.width / settings.data.arenaWidth;
  this.arenaScaleH = this.height / settings.data.arenaHeight;

  // renderer bodies
  this.extras = stash()
  this.obstacles = stash()
  this.forces = stash()
  this.bullets = stash()
  this.pucks = stash()
  this.paddles = stash()
  this.shields = stash()

  this.setupAddedRemoved('game')
  this.bear = new Bear($('#expressions')[0]);

  createGamePieces(this.element);
  this.paddlePlayer = new Paddle(this.element, 'p1', this)
  this.paddleCPU = new Paddle(this.element, 'p2', this)
}

Renderer.prototype = {
  setupAddedRemoved: function(worldName){
    if( this.onadded ){
      actions.off('added',this.onadded)
      actions.off('removed',this.onremoved)
    }

    this.onadded = function(type,world,body){
      if(world.name !== worldName) return;
      switch(type){
        case 'extra':
          var obj = new Extra(emptyPiece(), body, this);
          this.extras.set(body.index,obj)
          break;
        case 'bullet':
          var obj = createBullet(this.element, body)
          this.bullets.set(body.index,obj)
          break;
        case 'puck':
          var obj = new Puck(emptyPiece(), body, this);
          this.pucks.set(body.index,obj)
          break;
        case 'shield':
          var obj = new Shield(this.element, body, world);
          this.shields.set(body.index,obj)
          break;
        case 'force':
          var obj = createForce(this.element, body)
          this.forces.set(body.index,obj)
          break;
        case 'obstacle':
          var obj = createObstacle(this.element, body)
          this.obstacles.set(body.index,obj)
          break;
        default:
          throw new Error('invalid type: '+type);
      }
    }.bind(this)

    this.onremoved = function(type,world,body){
      if(world.name !== worldName) return;
      switch(type){
        case 'extra':
          this.extras.get(body.index).remove()
          this.extras.del(body.index);
          break;
        case 'bullet':
          removeBullet(this.bullets.get(body.index));
          this.bullets.del(body.index)
          break;
        case 'puck':
          this.pucks.get(body.index).remove();
          this.pucks.del(body.index);
          break;
        case 'shield':
          this.shields.get(body.index).remove();
          this.shields.del(body.index)
          break;
        case 'force':
          removeForce(this.forces.get(body.index));
          this.forces.del(body.index);
          break;
        case 'obstacle':
          removeObstacle(this.obstacles.get(body.index));
          this.obstacles.del(body.index);
          break;
        default:
          throw new Error('invalid type: '+type);
      }
    }.bind(this)

    actions.on('added',this.onadded)
    actions.on('removed',this.onremoved)
  },

  reset: function(){
    debug('reset')

    // remove all forces/extras/pucks
    while(this.pucks.values.length)
      this.pucks.values.pop().remove()
    while(this.forces.values.length)
      removeForce(this.forces.values.pop());
    while(this.extras.values.length)
      this.extras.values.pop().remove()
    while(this.obstacles.values.length)
      removeObstacle(this.obstacles.values.pop());
    while(this.bullets.values.length)
      removeBullet(this.bullets.values.pop());
    while(this.shields.values.length)
      this.shields.values.pop().reset();

    this.pucks.empty()
    this.forces.empty()
    this.extras.empty()
    this.bullets.empty()
    this.obstacles.empty()
    this.shields.empty()

    toggleFog(false);
  },
  triggerEvent: function(id, paramObj){
    debug('triggerEvent',arguments)
    switch(id) {
      case 'hitOpponent':
        this.bear.change('angry');
        break;
      case 'hitMe':
        this.bear.change('flirt');
        break;
      case 'gameStart':
        this.bear.change('jawdrop');
        break;
      case 'toggleFog':
        Effects.toggleFog(paramObj.active, id==1)
        break;
      case 'puckBounce':
        if(window.navigator.vibrate)
          window.navigator.vibrate(200)
        break;
      case 'resetPaddles':
        // var world = this.world; // lazy fix

        // if( !world ) return
        // //Used for reseting shields in an early stage.
        // for(var i = 0; i < world.level.player.shields; i++){
        //   var obj = new Shield(this.element);
        // }
        // break;
    }
  },

  changeView: function(){
    debug('changeView',arguments)
  },

  getWorldCoordinate: function(){
    debug('getWorldCoordinate',arguments)
  },

  activePlayer: function(id, init, multiplayer){
    debug('activePlayer',arguments)
    if( multiplayer ){
      this.setupAddedRemoved('sync')
    } else {
      this.setupAddedRemoved('game')
    }
  },

  swapToVideoTexture: function(){
    debug('swapToVideoTexture',arguments)
  },

  render: function(world, alpha){
    this.bear.render();

    if( world.state === World.PLAYING || world.state === World.PREVIEW ) {
      //Update paddles
      this.paddlePlayer.update(world.paddles.get(world.players.a.paddle), alpha)
      this.paddleCPU.update(world.paddles.get(world.players.b.paddle), alpha)
    } else if(world.paddles.length < 1) {
      //Reset to center
      this.paddlePlayer.updateToCenter()
      this.paddleCPU.updateToCenter()
    }

    if(world.state !== World.PLAYING)
      return;

    var w = settings.data.arenaWidth
      , h = settings.data.arenaHeight;

    // update pucks
    for(var i=0; i < world.pucks.values.length; i++){
      var puck = world.pucks.values[i]
      this.pucks.get(puck.index).update(alpha);
    }

    

    // update extras
    for(var i=0; i < world.extras.values.length; i++){
      var extra = world.extras.values[i]
      this.extras.get(extra.index).update(alpha)
    }

    // update forces
    for(var i=0; i < world.forces.values.length; i++){
      var force = world.forces.values[i]
        , div = this.forces.get(force.index)
      div.setAttribute('class', force.active ? 'effect force active' : 'effect force' );
    }

    // update bullets
    for(var i=0; i < world.bullets.values.length; i++){
      var bullet = world.bullets.values[i]
        , div = this.bullets.get(bullet.index)
        , x = bullet.previous[0] + (bullet.current[0]-bullet.previous[0])*alpha
        , y = bullet.previous[1] + (bullet.current[1]-bullet.previous[1])*alpha;
      // TODO update the sprite depending on x
    }
  },

  getPosition:function(body, alpha){
    var x = body.previous[0] + (body.current[0]-body.previous[0])*alpha
      , y = body.previous[1] + (body.current[1]-body.previous[1])*alpha

    x = x * this.arenaScaleW;
    y = y * this.arenaScaleH;
    return [x,y];
  }
}

var piece = $('<div class="empty"><div class="icon"></div></div>')
  , shield = $('<div class="shield"></div>')
  , extra = piece.clone()

function createForce(world,body){
  debug('create force',body.index);
  return $('.effect.force')[0];
}
function createBullet(world,body){
  debug('create bullet',body.index);
}
function createObstacle(world,body){
  debug('create obstacle',body.index);
  var id = body.data.id;
  switch(id) {
    case 'triangle-right':
    case 'triangle-left':
      return $('.obstacle.'+id).show()[0];

    case 'diamond':
    case 'hexagon':
    case 'block-breakout':
    case 'block-rect':
      // TODO?
      break;

    default:
      throw new Error('unsupported obstacle: '+id)
  }
}

function removeForce(world,body){
  debug('remove force')
  $('.effect.force').removeClass('active');
}
function removeBullet(world,body){
  debug('remove bullet')
}
function removeObstacle(obstacle){
  debug('remove obstacle')
  $(obstacle).hide();
}


function createGamePieces(parent){
  var arena = $('.arena', parent);
  for(var i = 0; i < 12; i++) {
    arena.append( piece.clone() );
  }
}

function resetGamePiece(piece){
  $(piece).attr('class', 'empty')
}

function emptyPiece(){
  return $('.arena').find('.empty').first().removeAttr('style');
}

function toggleFog(active, mirror){
  var fog = $('.effects .effect.fog');
  if( active ) {
    fog.removeClass('hidden')
    setTimeout(function(){
      fog.addClass('active');
    }, 4)
  } else {
    setTimeout(function(){
      fog.addClass('hidden');
    }, 600);
    fog.removeClass('active');
  }
}