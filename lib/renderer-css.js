var debug = require('debug')('renderer:css')
  , settings = require('./settings');

module.exports = Renderer;

function Renderer(element){
  this.element = element;
  this.bounds = [0,settings.data.arenaWidth,settings.data.arenaHeight,0];

  // renderer bodies
  this.extras = stash()
  this.obstacles = stash()
  this.forces = stash()
  this.bullets = stash()
  this.pucks = stash()
}

Renderer.prototype = {

  reset: function(){
    debug('reset')

    // remove all forces/extras/pucks
    while(this.pucks.values.length)
      removePuck(this.pucks.values.pop());
    while(this.forces.values.length)
      removeForce(this.forces.values.pop());
    while(this.extras.values.length)
      removeExtra(this.extras.values.pop());
    while(this.obstacles.values.length)
      removeObstacle(this.obstacles.values.pop());
    while(this.bullets.values.length)
      removeBullet(this.bullets.values.pop(),this.bulletPool);

    this.pucks.empty()
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


    // update pucks
    for(var i=0; i < world.pucks.values.length; i++){
      var puck = world.pucks.values[i]
        , div = this.pucks.get(puck.id);
        , x = puck.previous[0] + (puck.current[0]-puck.previous[0])*alpha
        , y = puck.previous[1] + (puck.current[1]-puck.previous[1])*alpha;

      // TODO position the div

      // TODO update the sprite depending on x
    }

    // update bullets
    for(var i=0; i < world.bullets.values.length; i++){
      var bullet = world.bullets.values[i]
        , div = this.bullets.get(bullet.id);
        , x = bullet.previous[0] + (bullet.current[0]-bullet.previous[0])*alpha
        , y = bullet.previous[1] + (bullet.current[1]-bullet.previous[1])*alpha;

      // TODO position the div

      // TODO update the sprite depending on x
    }
  }
}



function createPuck(world,body){}
function createForce(world,body){}
function createExtra(world,body){}
function createBullet(world,body){}
function createObstacle(world,body){}

function removePuck(world,body){}
function removeForce(world,body){}
function removeExtra(world,body){}
function removeBullet(world,body){}
function removeObstacle(world,body){}



