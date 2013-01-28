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
        , id = body.id;

      // create pucks
      if( world.pucks.has(id) ){
        var obj = createPuck(this.element, body)
        this.pucks.set(id,obj)

      // create forces
      } else if( world.forces.has(id) ){
        var obj = createForce(this.element, body)
        this.forces.set(id,obj)

      // create extras
      } else if( world.extras.has(id) ){
        var obj = createExtra(this.element, body)
        this.extras.set(id,obj)

      // create bullets
      } else if( world.bullets.has(id) ){
        var obj = createBullet(this.element, body)
        this.bullets.set(id,obj)

      // create extras
      } else if( world.obstacles.has(id) ){
        var obj = createExtra(this.element, body)
        this.obstacles.set(id,obj)

      } else {
        console.warn('supposed to add',body,id)

      }
    }

    // remove bodies
    while(world.removed.length){
      var body = world.removed.pop()
        , id = body.id;

      if( this.bullets.has(id) ){
        removeBullet(this.bullets.get(id),this.bulletPool);
        this.bullets.del(id)

      } else if( this.pucks.has(id) ){
        removePuck(this.pucks.get(id));
        this.pucks.del(id);

      } else if( this.paddles.has(id) ){
        removePaddles(this.paddles.get(id));
        this.paddles.del(id);

      } else if( this.forces.has(id) ){
        removeForce(this.forces.get(id));
        this.forces.del(id);

      } else if( this.extras.has(id) ){
        removeExtra(this.extras.get(id));
        this.extras.del(id);

      } else if( this.obstacles.has(id) ){
        removeObstacle(this.obstacles.get(id));
        this.obstacles.del(id);

      } else {
        console.warn('supposed to remove',body,obj)

      }
    }

    if(world.paused)
      return;

    // update pucks
    for(var i=0; i < world.pucks.values.length; i++){
      var puck = world.pucks.values[i]
        , div = this.pucks.get(puck.id)
        , x = puck.previous[0] + (puck.current[0]-puck.previous[0])*alpha
        , y = puck.previous[1] + (puck.current[1]-puck.previous[1])*alpha;

      var bg = parseInt(x/w * 90)
      x = x / w * this.width;
      y = y / h * this.height;
      // TODO position the div
      div.style.webkitTransform = 'rotateX(-90deg) translateX('+(x-81)+'px) translateY(-50%) translateZ('+y+'px)';
      // TODO update the sprite depending on x
      div.setAttribute('class', ('puck puck_00' + (bg < 10 ? '0'+bg : bg)));
    }
    if( world.paddles.has(0) ) {
      this.movePaddle(world.paddles.get(0), this.paddlePlayer, alpha)
      this.movePaddle(world.paddles.get(1), this.paddleCPU, alpha)
    }

    // update bullets
    for(var i=0; i < world.bullets.values.length; i++){
      var bullet = world.bullets.values[i]
        , div = this.bullets.get(bullet.id)
        , x = bullet.previous[0] + (bullet.current[0]-bullet.previous[0])*alpha
        , y = bullet.previous[1] + (bullet.current[1]-bullet.previous[1])*alpha;

      // TODO position the div

      // TODO update the sprite depending on x
    }
  },

  movePaddle: function(paddle, element, alpha) {
    var w = settings.data.arenaWidth
      , h = settings.data.arenaHeight;
    if( paddle ) {
      var x = paddle.previous[0] + (paddle.current[0]-paddle.previous[0])*alpha
        , y = paddle.previous[1] + (paddle.current[1]-paddle.previous[1])*alpha
        , bg = parseInt(x/w * 92)
      
      x = x / w * this.width;
      y = y / h * this.height;
      
      element.style.webkitTransform = 'rotateX(-90deg) translateX('+(x-180)+'px) translateY(-50%) translateZ('+y+'px)';
      // TODO update the sprite depending on x
      element.setAttribute('class', ('paddle paddle_00' + (bg < 10 ? '0'+bg : bg)));
    }
  }
}

var puck = $('<div class="puck p1_0002"></div>')
  , paddle = $('<div class="paddle player"></div>');


function createPuck(parent,body){
  debug('Create puck');
  return puck.clone().appendTo($(parent).find('.arena'))[0];
}
function createPaddle(parent,body){
  debug('Create paddle');
  return paddle.clone().appendTo($(parent).find('.arena'))[0];
}
function createForce(world,body){
  debug('Create force');
}
function createExtra(world,body){
  debug('Create extra');
}
function createBullet(world,body){
  debug('Create bullet');
}
function createObstacle(world,body){
  debug('Create obstacle');
}

function removePuck(puck){
  debug('removePuck', puck)
  $(puck).remove();
}
function removePaddles(parent,body){
  // puck.parent().remove(puck);
}
function removeForce(world,body){}
function removeExtra(world,body){}
function removeBullet(world,body){}
function removeObstacle(world,body){}



