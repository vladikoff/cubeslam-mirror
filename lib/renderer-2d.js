var draw = require('./support/draw')
  , settings = require('./settings')
  , poly = require('geom').poly;

module.exports = Renderer;

var PADDLE_COLORS = ['#f00','#00f'];

function Renderer(canvas){
  this.canvas = canvas;
  this.context = canvas.getContext('2d');
  this.inverted = false;
  this.stats = {}
  this.bounds = [0,settings.data.arenaWidth,settings.data.arenaHeight,0];
  this.draw = draw(this.context)
  this.resize = true;
}

Renderer.prototype = {

  constructor: Renderer,

  reset: function(){},

  triggerEvent: function(){},

  changeView: function(){},

  activePlayer: function(id){
    this.inverted = id;
    this.resize = true;
  },

  drawPaddle: function(ctx, paddle, style){
    this.draw.poly(paddle.shape).stroke(style,3.5)
    this.draw.line([paddle.previous,paddle.current]).stroke(style)
    this.stats.paddles++;
  },

  drawBounds: function(ctx){
    this.draw.rect(this.bounds).stroke('green')
    this.stats.bounds++;
  },

  // Draw a gradient based on the type and mass of the force
  drawForce: function(ctx, force){
    if( !force.active ) return;
    var x = force.position[0]
      , y = force.position[1]
      , r = force.radius;

    // Create radial gradient
    var grad = ctx.createRadialGradient(x,y,0,x,y,r);
    switch(force.type){
      case 'repell':
        grad.addColorStop(0, 'rgba(255,0,0,1)');
        grad.addColorStop(1, 'rgba(255,0,0,0)');
        break;
      case 'attract':
        grad.addColorStop(0, 'rgba(0,255,0,1)');
        grad.addColorStop(1, 'rgba(0,255,0,0)');
        break;
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x-r,y-r,force.mass,force.mass)
    this.stats.forces++;
  },

  drawBullet: function(ctx, bullet){
    if( !bullet ) return;
    this.draw.poly(bullet.shape).stroke('white')
    this.stats.bullets++;
  },

  drawObstacle: function(ctx, obstacle){
    ctx.fillStyle = 'pink'
    this.draw.poly(obstacle.shape).stroke('pink')
    this.stats.obstacles++;
  },

  drawShield: function(ctx, shield){
    this.draw.poly(shield.shape).stroke('gray')
    this.stats.shields++;
  },

  drawExtra: function(ctx, extra){
    this.draw.poly(extra.shape).stroke('blue')
    this.stats.extras++;
  },

  drawPuck: function(ctx, puck, index){
    if( puck.removed ) return;
    var color = index > 0 ? 'white' : 'yellow'
    this.draw.poly(puck.shape).stroke(color)
    this.draw.line([puck.previous,puck.current]).stroke(color)

    // draw an offset "shadow"
    if( puck.offset[0] || puck.offset[1] ){
      poly.translate(puck.shape,puck.offset[0],puck.offset[1])
      this.draw.poly(puck.shape).stroke('aqua')
      poly.translate(puck.shape,-puck.offset[0],-puck.offset[1])
    }

    this.stats.pucks++;
  },

  drawInfo: function(ctx, world){
    ctx.font = '1.5em courier'
    ctx.fillStyle = 'black'
    var t = ctx.measureText('0/0').width
      , w = this.w
      , h = this.h;
    ctx.fillText('0/0',0,20)
    ctx.fillText('1/0',w-t,20)
    ctx.fillText('0/1',0,h)
    ctx.fillText('1/1',w-t,h)

    // draw a line every x steps
    for( var x=0; x <= 1; x += .1){
      // top
      ctx.moveTo(x*w,0)
      ctx.lineTo(x*w,5)
      // bottom
      ctx.moveTo(x*w,h)
      ctx.lineTo(x*w,h-10)
    }
    ctx.stroke()

    // draw the player names
    ctx.font = '5em courier'
    var t = ctx.measureText(world.players.b.name).width;
    ctx.save()
    ctx.translate(w/2,0)
    ctx.rotate(Math.PI)
    ctx.fillText(world.players.b.name,-t/2,0);
    ctx.restore()

    var t = ctx.measureText(world.players.a.name).width;
    ctx.fillText(world.players.a.name,w/2-t/2,h);

    // draw the player scores
    ctx.font = '10em courier'
    var t = ctx.measureText(world.players.b.score).width;
    ctx.save()
    ctx.translate(w/2,100)
    ctx.rotate(Math.PI)
    ctx.fillText(world.players.b.score,-t/2,0);
    ctx.restore()

    var t = ctx.measureText(world.players.a.score).width;
    ctx.fillText(world.players.a.score,w/2-t/2,h-100);
  },

  drawStats: function(ctx){
    var x = 0
      , y = this.h
      , h = 50;
    ctx.fillStyle = 'white'
    ctx.font = '4em courier'
    for(var k in this.stats)
      ctx.fillText(k+': '+this.stats[k],x,y-=h);
  },

  render: function(world, alpha){
    this.stats.paddles = 0
    this.stats.bounds = 0
    this.stats.forces = 0
    this.stats.pucks = 0
    this.stats.extras = 0
    this.stats.links = 0
    this.stats.bullets = 0
    this.stats.obstacles = 0
    this.stats.shields = 0


    // bounds = [t,r,b,l]
    var w = this.w = settings.data.arenaWidth
      , h = this.h = settings.data.arenaHeight
      , margin = 50 // room for drawing corner positions
      , scale = .25
      , ctx = this.context;

    // clears canvas and makes sure it stays with the bounds (w. margin)
    if( this.resize ){
      this.canvas.width = (w+margin)*scale;
      this.canvas.height = (h+margin)*scale;

      // guest is flipped
      if( this.inverted ){
        ctx.translate(this.canvas.width/2,this.canvas.height/2)
        ctx.rotate(Math.PI)
        ctx.translate(-this.canvas.width/2,-this.canvas.height/2)
      }

      // scale it down because 800x1600 is huge...
      ctx.scale(scale,scale)

      // move everything in according to margin
      ctx.translate(margin/2,margin/2)

      this.resize = false;
    } else {
      ctx.fillStyle = 'rgba(0,0,0,.3)'
      ctx.fillRect(0,0,this.canvas.width/scale,this.canvas.height/scale)
    }

    // draw some text at the corners
    this.drawInfo(ctx, world)

    this.drawBounds(ctx);

    // draw the video in the background
    if( this.localVideo )
      ctx.drawImage(this.localVideo,0,0);

    for(var i=0, l=world.paddles.values.length; i < l; i++ )
      this.drawPaddle(ctx,world.paddles.values[i],PADDLE_COLORS[i]);

    for(var i=0, l=world.forces.values.length; i < l; i++)
      this.drawForce(ctx,world.forces.values[i]);

    for(var i=0, l=world.bullets.values.length; i < l; i++)
      this.drawBullet(ctx,world.bullets.values[i]);

    for(var i=0, l=world.obstacles.values.length; i < l; i++)
      this.drawObstacle(ctx,world.obstacles.values[i]);

    for(var i=0, l=world.extras.values.length; i < l; i++)
      this.drawExtra(ctx,world.extras.values[i]);

    for(var i=0, l=world.pucks.values.length; i < l; i++)
      this.drawPuck(ctx,world.pucks.values[i],i);

    for(var i=0, l=world.shields.values.length; i < l; i++)
      this.drawShield(ctx,world.shields.values[i]);

    this.drawStats(ctx)
  }
}

