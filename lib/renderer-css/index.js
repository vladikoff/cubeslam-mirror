var debug = require('debug')('renderer:css')
  , settings = require('../settings')
  , actions = require('../actions')
  , stash = require('stash')
  , cssEvent = require('css-emitter')
  , World = require('../world')
  , Bear = require('./bear')
  , Shield = require('./shield')
  , Paddle = require('./paddle')
  , Puck = require('./puck')
  , Bullet = require('./bullet')
  , Extra = require('./extra')
  , Effects = require('./effects')
  , Obstacle = require('./obstacle')
  , pool = require('../support/pool')
  , $ = require('jquery');

module.exports = Renderer;

function Renderer(element){
  this.element = element;

  this.arena = $('.arena', $(this.element))[0];

  this.width = 580;
  this.height = 760;
  //Calcultaded matrix for element transforms.
  this.matrix = 'matrix3d(1, 0, 0, 0, 0, 0.11667073709933327, 0.993170649538486, 0, 0, -0.993170649538486, 0.11667073709933327, 0, 0, 133.06863596332892, -778.6025754663666, 1) '

  this.arenaWidth = settings.data.arenaWidth;
  this.arenaHeight = settings.data.arenaHeight;

  this.arenaScaleW = this.width / this.arenaWidth;
  this.arenaScaleH = this.height / this.arenaHeight;

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
      if(world.name !== worldName) { return; }
      var obj;
      switch(type){
        case 'extra':
          obj = Extra.alloc().create(this.gamePiece(), body)
          this.extras.set(body.index,obj)
          break;
        case 'bullet':
          obj = Bullet.alloc().create(this.gamePiece(), body, this);
          this.bullets.set(body.index,obj)
          break;
        case 'puck':
          obj = Puck.alloc().create(this.gamePiece(), body, this);
          this.pucks.set(body.index,obj)
          break;
        case 'shield':
          obj = Shield.alloc().create(this.element, body, world);
          this.shields.set(body.index,obj)
          break;
        case 'force':
          obj = createForce(this.gamePiece(), body)
          this.forces.set(body.index,obj)
          break;
        case 'obstacle':
          obj = Obstacle.alloc().create(body);
          this.obstacles.set(body.index,obj)
          break;
        default:
          throw new Error('invalid type: '+type);
      }
    }.bind(this)

    this.onremoved = function(type,world,body){
      if(world.name !== worldName)  { return; }
      switch(type){
        case 'extra':
          this.extras.get(body.index).remove()
          this.extras.del(body.index);
          break;
        case 'bullet':
          this.bullets.get(body.index).remove();
          this.bullets.del(body.index);
          break;
        case 'puck':
          this.pucks.get(body.index).remove();
          this.pucks.del(body.index);
          break;
        case 'shield':
          this.shields.get(body.index).remove();
          this.shields.del(body.index)
          if(window.navigator.vibrate) {
            window.navigator.vibrate([100, 100])
          }
          break;
        case 'force':
          removeForce(this.forces.get(body.index));
          this.forces.del(body.index);
          break;
        case 'obstacle':
          this.obstacles.get(body.index).remove();
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
    while(this.pucks.values.length) {
      this.pucks.values.pop().remove()
    }
    while(this.forces.values.length) {
      removeForce(this.forces.values.pop());
    }
    while(this.extras.values.length) {
      this.extras.values.pop().remove()
    }
    while(this.obstacles.values.length) {
      this.obstacles.values.pop().remove()
    }
    while(this.bullets.values.length) {
      this.bullets.values.pop().remove()
    }
    while(this.shields.values.length) {
      this.shields.values.pop().reset()
    }

    this.pucks.empty()
    this.forces.empty()
    this.extras.empty()
    this.bullets.empty()
    this.obstacles.empty()
    this.shields.empty()

    Effects.toggleFog(false);
    Effects.mirroredControls(false);

  },
  triggerEvent: function(id, paramObj){
    debug('triggerEvent',arguments)
    switch(id) {
      case 'hitOpponent':
        this.bear.change('angry');
        Effects.puckHit('me');
        if(window.navigator.vibrate) {
          window.navigator.vibrate([200, 500, 200])
        }
        break;
      case 'hitMe':
        this.bear.change('flirt');
        Effects.puckHit('opponent')
        if(window.navigator.vibrate) {
          window.navigator.vibrate([100, 100, 100])
        }
        break;
      case 'gameStart':
        this.bear.change('jawdrop');
        break;
      case 'toggleFog':
        Effects.toggleFog(paramObj.active, id==1)
        break;
      case 'mirrorEffect':
        Effects.mirroredControls(paramObj.active);
        break;
      case 'paddleResize':
      case 'puckBounce':
      case 'resetPaddles':
      case 'paddleHit':
      case 'activateExtra':
        break;
      default:
        console.warn('cssrenderer - missing event', id);
        break;
    }
  },

  gamePiece: function(){
    return GamePiece.alloc().create(this.arena)
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
    this.bear.render(world);

    if( world.state === World.PLAYING || world.state === World.PREVIEW ) {
      //Update paddles
      this.paddlePlayer.update(this, alpha, world.paddles.get(world.players.a.paddle))
      this.paddleCPU.update(this, alpha, world.paddles.get(world.players.b.paddle))
    } else if(world.paddles.length < 1) {
      //Reset to center
      this.paddlePlayer.updateToCenter(this)
      this.paddleCPU.updateToCenter(this)
    }

    if(world.state !== World.PLAYING){
      return;
    }
    var i = 0;
    // update pucks
    for(i=0; i < world.pucks.values.length; i++){
      var puck = world.pucks.values[i]
      this.pucks.get(puck.index).update(this, alpha);
    }

    // update extras
    for(i=0; i < world.extras.values.length; i++){
      var extra = world.extras.values[i]
      this.extras.get(extra.index).update(this, alpha)
    }

    // update shields
    for(i=0; i < world.shields.values.length; i++){
      var shield = world.shields.values[i]
      this.shields.get(shield.index).update(this)
    }

    // update forces
    for(i=0; i < world.forces.values.length; i++){
      var force = world.forces.values[i]
        , div = this.forces.get(force.index)
      div.setAttribute('class', force.active ? 'effect force active' : 'effect force' );
    }

    // update bullets
    for(i=0; i < world.bullets.values.length; i++){
      var bullet = world.bullets.values[i]
      this.bullets.get(bullet.index).update(this, alpha);
    }
  },

  updatePosition:function(piece, alpha){
    var x = piece.body.current[0]*alpha + piece.body.previous[0]*(1-alpha);
    var y = piece.body.current[1]*alpha + piece.body.previous[1]*(1-alpha);

    var w = piece.width||0;
    piece.sprite = parseInt((x-w)/(this.arenaWidth-w*2) * (piece.sprites-1), 10)+1

    piece.x = x * this.arenaScaleW;
    piece.y = y * this.arenaScaleH;
  }
}

function GamePiece(){
  this.element = null;
}

GamePiece.prototype = {
  create: function(arena){
    if( this.element ) {
      return this;
    }

    arena = $(arena);
    this.element = $('<div class="empty"><div class="icon"></div></div>');
    arena.append(this.element);
    return this;
  },
  remove: function(){
    this.element[0].setAttribute('class', 'empty');
    GamePiece.free(this);
  }
}

pool(GamePiece, 10)

function createForce(world,body){
  debug('create force',body.index);
  return $('.effect.force').addClass('active')[0];
}
function removeForce(world,body){
  debug('remove force')
  $('.effect.force').removeClass('active');
}