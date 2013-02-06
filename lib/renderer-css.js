var debug = require('debug')('renderer:css')
  , settings = require('./settings')
  , stash = require('stash')
  , $ = require('jquery');

module.exports = Renderer;

function Renderer(element){
  this.element = element;

  this.width = 1280;
  this.height = 1600;

  // renderer bodies
  this.extras = stash()
  this.obstacles = stash()
  this.forces = stash()
  this.bullets = stash()
  this.pucks = stash()
  this.paddles = stash()

  this.paddlePlayer = createPaddle(this.element);
  this.paddleCPU = createPaddle(this.element);
}

Renderer.prototype = {

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
      removeBullet(this.bullets.values.pop(),this.bulletPool);

    this.pucks.empty()
    this.paddles.empty()
    this.forces.empty()
    this.extras.empty()
    this.bullets.empty()
    this.obstacles.empty()
  },

  triggerEvent: function(){
    debug('triggerEvent',arguments)
  },

  changeView: function(){
    debug('changeView',arguments)
  },

  getWorldCoordinate: function(){
    debug('getWorldCoordinate',arguments)
  },

  activePlayer: function(id){
    debug('activePlayer',arguments)

    // if active player id is `1`
    // rotate so player b is the closest one
  },

  swapToVideoTexture: function(){
    debug('swapToVideoTexture',arguments)
  },

  render: function(world, alpha){
    var w = settings.data.arenaWidth
      , h = settings.data.arenaHeight;

    // add bodies
    while(world.added.length){
      var body = world.added.pop()
        , index = body.index;

      // create pucks
      if( world.pucks.has(index) ){
        var obj = createPuck(this.element, body)
        this.pucks.set(index,obj)

      // create forces
      } else if( world.forces.has(index) ){
        var obj = createForce(this.element, body)
        this.forces.set(index,obj)

      // create extras
      } else if( world.extras.has(index) ){
        var obj = createExtra(this.element, body)
        this.extras.set(index,obj)

      // create bullets
      } else if( world.bullets.has(index) ){
        var obj = createBullet(this.element, body)
        this.bullets.set(index,obj)

      // create extras
      } else if( world.obstacles.has(index) ){
        var obj = createExtra(this.element, body)
        this.obstacles.set(index,obj)

      } else {
        console.warn('supposed to add',index,body)

      }
    }

    // remove bodies
    while(world.removed.length){
      var body = world.removed.pop()
        , index = body.index;

      if( this.bullets.has(index) ){
        removeBullet(this.bullets.get(index),this.bulletPool);
        this.bullets.del(index)

      } else if( this.pucks.has(index) ){
        removePuck(this.pucks.get(index));
        this.pucks.del(index);

      } else if( this.paddles.has(index) ){
        removePaddle(this.paddles.get(index));
        this.paddles.del(index);

      } else if( this.forces.has(index) ){
        removeForce(this.forces.get(index));
        this.forces.del(index);

      } else if( this.extras.has(index) ){
        removeExtra(this.extras.get(index));
        this.extras.del(index);

      } else if( this.obstacles.has(index) ){
        removeObstacle(this.obstacles.get(index));
        this.obstacles.del(index);

      } else {
        console.warn('supposed to remove',index,body)

      }
    }

    if(world.paused)
      return;

    // update pucks
    for(var i=0; i < world.pucks.values.length; i++){
      var puck = world.pucks.values[i]
        , div = this.pucks.get(puck.index)
        , x = puck.previous[0] + (puck.current[0]-puck.previous[0])*alpha
        , y = puck.previous[1] + (puck.current[1]-puck.previous[1])*alpha;

      var bg = parseInt(x/w * 90)
      x = x / w * this.width;
      y = y / h * this.height;
      // TODO position the div
      div.style.webkitTransform = 'rotateX(-90deg) translateX('+(x-55)+'px) translateY(-50%) translateZ('+(y+40)+'px)';
      // TODO update the sprite depending on x
      div.setAttribute('class', ('puck puck_00' + (bg < 10 ? '0'+bg : bg)));
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
      div.style.webkitTransform = 'rotateX(-90deg) translateX('+(x-64)+'px) translateY(-50%) translateZ('+y+'px)';
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
        , bg = parseInt(x/w * 92)

      x = x / w * this.width;
      y = y / h * this.height;

      element.style.webkitTransform = 'rotateX(-90deg) translateX('+(x-150)+'px) translateY(-50%) translateZ('+y+'px)';
      // TODO update the sprite depending on x
      element.setAttribute('class', (player + ' ' + player + '_00' + (bg < 10 ? '0'+bg : bg)));
    }
  }
}

var puck = $('<div class="puck puck_0045"></div>')
  , paddle = $('<div class="paddle player"></div>')
  , extra = $('<div class="extra"></div>');


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
  debug('create extra', body.id);
  return extra.clone().appendTo($(parent).find('.arena')).addClass(body.id)[0];
}
function createBullet(world,body){
  debug('create bullet',body.index);
}
function createObstacle(world,body){
  debug('create obstacle',body.index);
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



