var debug = require('debug')('renderer:css')
  , settings = require('./settings')
  , actions = require('./actions')
  , stash = require('stash')
  , cssEvent = require('css-emitter')
  , $ = require('jquery');

module.exports = Renderer;

function Renderer(element){
  this.element = element;

  this.width = 768;
  this.height = 1024;

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

  this.paddlePlayer = createPaddle(this.element);
  this.paddleCPU = createPaddle(this.element);
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
          var obj = createExtra(this.element, body)
          this.extras.set(body.index,obj)
          break;
        case 'bullet':
          var obj = createBullet(this.element, body)
          this.bullets.set(body.index,obj)
          break;
        case 'puck':
          var obj = createPuck(this.element, body)
          this.pucks.set(body.index,obj)
          break;
        case 'shield':
          var obj = createShield(this.element, body)
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
          removeExtra(this.extras.get(body.index));
          this.extras.del(body.index);
          break;
        case 'bullet':
          removeBullet(this.bullets.get(body.index));
          this.bullets.del(body.index)
          break;
        case 'puck':
          removePuck(this.pucks.get(body.index));
          this.pucks.del(body.index);
          break;
        case 'shield':
          removeShield(this.shields.get(body.index));
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
    while(this.pucks.values.length) {
      removePuck(this.pucks.values.pop());
    } while(this.forces.values.length)
      removeForce(this.forces.values.pop());
    while(this.extras.values.length)
      removeExtra(this.extras.values.pop());
    while(this.obstacles.values.length)
      removeObstacle(this.obstacles.values.pop());
    while(this.bullets.values.length)
      removeBullet(this.bullets.values.pop());
    while(this.shields.values.length)
      removeShield(this.shields.values.pop());

    this.pucks.empty()
    this.paddles.empty()
    this.forces.empty()
    this.extras.empty()
    this.bullets.empty()
    this.obstacles.empty()
    this.shields.empty()
  },

  triggerEvent: function(id){
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

    if(world.state !== 'playing')
      return;

    var w = settings.data.arenaWidth
      , h = settings.data.arenaHeight;

    // update pucks
    for(var i=0; i < world.pucks.values.length; i++){
      var puck = world.pucks.values[i]
        , div = this.pucks.get(puck.index)
        , x = puck.previous[0] + (puck.current[0]-puck.previous[0])*alpha
        , y = puck.previous[1] + (puck.current[1]-puck.previous[1])*alpha;

      var bg = parseInt(x/w * 30) + 1
      x = x / w * this.width;
      y = y / h * this.height;
      // TODO position the div
      div.style.webkitTransform = 'rotateX(-90deg) translateX('+(x-23)+'px) translateY(-50%) translateZ('+(y+23)+'px) scale(1.5)';
      // TODO update the sprite depending on x
      div.setAttribute('class', ('puck puck-' + (bg < 10 ? '0'+bg : bg)));
    }
    if( world.paddles.has(world.me.paddle) ) {
      this.movePaddle(world.paddles.get(world.me.paddle), this.paddlePlayer, 'p1', alpha)
      this.movePaddle(world.paddles.get(world.opponent.paddle), this.paddleCPU, 'p2', alpha)
    }

    // update extras
    for(var i=0; i < world.extras.values.length; i++){
      var extra = world.extras.values[i]
        , div = this.extras.get(extra.index)
        , x = extra.current[0]
        , y = extra.current[1]
        x = x / w * this.width;
        y = y / h * this.height;
      div.style.webkitTransform = 'rotateX(-90deg) translateX('+(x-35)+'px) translateY(-50%) translateZ('+y+'px) scale(1.5)';
    }

    // update bullets
    for(var i=0; i < world.bullets.values.length; i++){
      var bullet = world.bullets.values[i]
        , div = this.bullets.get(bullet.index)
        , x = bullet.previous[0] + (bullet.current[0]-bullet.previous[0])*alpha
        , y = bullet.previous[1] + (bullet.current[1]-bullet.previous[1])*alpha;

      // TODO position the div

      // TODO update the sprite depending on x
    }
  },

  movePaddle: function(paddle, element, player, alpha) {
    var w = settings.data.arenaWidth
      , h = settings.data.arenaHeight;
    if( paddle ) {
      var x = paddle.previous[0] + (paddle.current[0]-paddle.previous[0])*alpha
        , y = paddle.previous[1] + (paddle.current[1]-paddle.previous[1])*alpha
        , bg = parseInt((x-189)/(w-189*2) * 30)+1

      x = x / w * this.width;
      y = y / h * this.height;

      var scaleX = paddle.data.resized || 1
      element.style.webkitTransform = 'rotateX(-90deg) translateX('+(x-78)+'px) translateY(-50%) translateZ('+y+'px) scale(1.5) scaleX('+scaleX+')' ;
      // TODO update the sprite depending on x
      element.setAttribute('class', (player + ' ' + player + '-00' + (bg < 10 ? '0'+bg : bg)));
    }
  }
}

var puck = $('<div class="puck puck-11"></div>')
  , paddle = $('<div class="paddle player"></div>')
  , shield = $('<div class="shield"></div>')
  , extra = $('<div class="extra"><div class="icon"></div></div>');


function createPuck(parent,body){
  debug('create puck',body.index);
  return puck.clone().appendTo($(parent).find('.arena'))[0];
}
function createPaddle(parent){
  debug('create paddle');
  return paddle.clone().appendTo($(parent).find('.arena'))[0];
}
function createForce(world,body){
  debug('create force',body.index);
}
function createExtra(parent,body){
  debug('create extra', body.data.id);
  return extra.clone().appendTo($(parent).find('.arena')).addClass(body.data.id.replace(' ', '-'))[0];
}
function createBullet(world,body){
  debug('create bullet',body.index);
}
function createObstacle(world,body){
  debug('create obstacle',body.index);
}
function createShield(parent,body){
  debug('create shield',body.index, body.data.index, body.data.player);
  var s = shield.clone()
          .appendTo($(parent)
          .find('.shields-'+body.data.player))
          .addClass('shield-'+parseInt(body.data.index+1));
  setTimeout( function(){
    s.addClass('visible');
  }, 100)
  return s[0]
}

function removePuck(puck){
  debug('remove puck',puck.index)
  $(puck).remove();
}
function removePaddle(parent,body){
  debug('remove paddle')
  // puck.parent().remove(puck);
}
function removeForce(world,body){
  debug('remove force')
}
function removeExtra(extra){
  debug('remove extra')
  $(extra).remove();
}
function removeBullet(world,body){
  debug('remove bullet')
}
function removeObstacle(world,body){
  debug('remove obstacle')
}
function removeShield(shield){
  $(shield).removeClass('visible').addClass('hit');
  cssEvent(shield).on('end',function(){
    $(shield).remove();
  })

  debug('remove shield');
}

function Bear(element){
  this.el = element;
  this.expressions = [];
  this.change();
  this.index = 0
}

Bear.prototype = {
  change: function(to){
    var self = this;
    switch(to) {
      case 'angry':
        this.expressions = [];
        var exp = ['angry-1', 'angry-2', 'angry-3', 'angry-4', 'angry-5', 'angry-6', 'angry-6', 'angry-6', 'angry-6', 'angry-6', 'angry-6', 'angry-6', 'angry-6', 'angry-6', 'angry-6', 'angry-6', 'angry-6', 'angry-6', 'angry-6'];
        this.expressions.push.apply(this.expressions, exp.concat())
        this.expressions.push.apply(this.expressions, exp.concat().reverse())
        break;
      case 'jawdrop':
        this.expressions = [];
        var exp = ['jawdrop-1', 'jawdrop-2', 'jawdrop-3', 'jawdrop-4', 'jawdrop-5', 'jawdrop-5', 'jawdrop-5', 'jawdrop-5'];
        this.expressions.push.apply(this.expressions, exp.concat())
        this.expressions.push.apply(this.expressions, exp.concat().reverse())
        break;
      case 'flirt':
        this.expressions = [];
        var exp = ['flirt-1', 'flirt-2', 'flirt-3', 'flirt-4', 'flirt-5', 'flirt-6', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7'];
        this.expressions.push.apply(this.expressions, exp.concat())
        this.expressions.push.apply(this.expressions, exp.concat().reverse())
        break;
      default:
        if(this.timeout)
          clearTimeout( this.timeout )
        this.timeout = setTimeout( function(){
          if(self.expressions.length<1)
            self.expressions.push('blink-2','blink-2', 'blink-1')
          self.change();
        }, 600 + Math.random() * 3500 );
        break;
    }
  },
  render: function() {
    if(this.expressions.length > 0 && ++this.index % 4 == 0) {
      var expression = this.expressions.shift()
      this.el.setAttribute('class', expression.split('-')[0] + ' ' + expression );
      this.index = 0;
    }
  },
}
