
module.exports = Renderer;

var PADDLE_COLORS = ['#f00','#00f'];

function Renderer(canvas){
  this.canvas = canvas;
  this.context = canvas.getContext('2d');
  this.inverted = false;
  this.stats = {}
  this.draw = draw(this.context)
}

Renderer.prototype = {

  reset: function(){},

  triggerEvent: function(){},

  changeView : function() { },

  activePlayer: function(id){
    this.inverted = id == 1;
  },

  swapToVideoTexture: function(canvas){
    this.localVideo = canvas;
  },

  drawPaddle: function(ctx, paddle, style){
    // TODO scale ctx to this.w/this.h?
    this.draw.poly(paddle.shape).stroke(style,3.5)
    this.stats.paddles++;
  },

  drawBounds: function(ctx,bounds){
    this.draw.rect(bounds).stroke('green')
    this.stats.bounds++;
  },

  // Draw a gradient based on the type and mass of the force
  drawForce: function(ctx, force){
    var w = this.w
      , h = this.h
      , m = Math.sqrt(w*w+h*h)
      , x = force.position[0]
      , y = force.position[1];

    // Create radial gradient
    var grad = ctx.createRadialGradient(x*w,y*h,0,x*w,y*h,force.mass/2*m);
    if( force.type == 'repell' ){
      grad.addColorStop(0, 'rgba(255,0,0,1)');
      grad.addColorStop(1, 'rgba(255,0,0,0)');
    } else if( force.type == 'attract' ) {
      grad.addColorStop(0, 'rgba(0,255,0,1)');
      grad.addColorStop(1, 'rgba(0,255,0,0)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x*w-force.mass/2*m,y*h-force.mass/2*m,force.mass*m,force.mass*m)
    this.stats.forces++;
  },

  drawExtra: function(ctx, extra){
    // TODO scale ctx by this.w/this.h
    this.draw.poly(extra.shape).stroke('blue')
    this.stats.extras++;
  },

  drawPuck: function(ctx, puck){
    // TODO scale ctx by this.w/this.h
    draw.poly(puck.shape).stroke()

    // draw trail
    ctx.beginPath()
    ctx.moveTo(puck.previous[0]*w,puck.previous[1]*h)
    ctx.lineTo(puck.current[0]*w,puck.current[1]*h)
    ctx.closePath()
    ctx.stroke()
    this.stats.pointMass++;
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
    ctx.font = '4em courier'
    ctx.fillText('paddles: '+this.stats.paddles,x,y-=h);
    ctx.fillText('bounds: '+this.stats.bounds,x,y-=h);
    ctx.fillText('forces: '+this.stats.forces,x,y-=h);
    ctx.fillText('pucks: '+this.stats.pucks,x,y-=h);
    ctx.fillText('extras: '+this.stats.extras,x,y-=h);
    ctx.fillText('links: '+this.stats.links,x,y-=h);
  },

  render: function(world, alpha){
    this.stats.paddles = 0
    this.stats.bounds = 0
    this.stats.forces = 0
    this.stats.pucks = 0
    this.stats.extras = 0
    this.stats.links = 0


    // bounds = [t,r,b,l]
    var w = this.w = world.bounds[1]-world.bounds[3]
      , h = this.h = world.bounds[2]-world.bounds[0]
      , margin = 50 // room for drawing corner positions
      , scale = .25
      , ctx = this.context;

    // clears canvas and makes sure it stays with the bounds (w. margin)
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

    // draw some text at the corners
    this.drawInfo(ctx, world)

    // draw the video in the background
    if( this.localVideo )
      ctx.drawImage(this.localVideo,0,0);

    ctx.strokeStyle = '#000';
    for(var i=0, l=world.forces.length; i < l; i++)
      this.drawForce(ctx,world.forces[i]);

    for(var i=2, l=world.extras.length; i < l; i++) // starts from 2 to skip the paddles
      this.drawExtra(ctx,world.extras[i]);

    for(var i=0, l=world.pucks.length; i < l; i++)
      this.drawPuck(ctx,world.pucks[i]);

    this.drawBounds(ctx,world.bounds);

    for(var i=0, l=world.paddles.length; i < l; i++ )
      this.drawPaddle(ctx,world.paddles[i],PADDLE_COLORS[i]);

    this.drawStats(ctx)
  }
}


var draw = function(ctx){
  var draw = {
    clear: function(){
      ctx.clearRect(0,0,canvas.width,canvas.height)
    },
    poly: function(p){
      ctx.beginPath();
      var v = p.vertices[0]
        , x = v[0]
        , y = v[1];
      for(var i=0; i < p.edges.length; i++){
        var e = p.edges[i];
        ctx.moveTo(x,y)
        ctx.lineTo(x+e[0],y+e[1]);

        // draw normal
        var n = vec.perp(e)
        vec.norm(n,n)
        var m = vec.lerp([x,y],[x+e[0],y+e[1]],.5)
        ctx.moveTo(m[0],m[1])
        ctx.lineTo(m[0]+n[0]*5,m[1]+n[1]*5)

        // draw index
        ctx.font = '3px courier'
        var t = ctx.measureText(i).width;
        ctx.fillText(i,m[0]-t/2,m[1])

        // free the vectors
        vec.free(n)
        vec.free(m)

        x += e[0]
        y += e[1];
      }
      ctx.closePath();

      // draw centroid
      var c = poly.centroid(p)
      ctx.fillRect(c[0]-1,c[1]-1,2,2)
      vec.free(c)

      return draw;
    },
    line: function(S){
      var a = S[0], b = S[1];
      ctx.beginPath();
      ctx.moveTo(a[0],a[1])
      ctx.lineTo(b[0],b[1])
      ctx.closePath();
      return draw;
    },
    rect: function(r){ // [t,r,b,l]
      ctx.beginPath();
      ctx.rect(r[0],r[3],r[1]-r[3],r[2]-r[0]);
      ctx.closePath();
      return draw;
    },
    point: function(a,r){
      r = r || 1
      ctx.beginPath();
      ctx.rect(a[0]-r,a[1]-r,r+r,r+r);
      ctx.closePath();
      return draw;
    },
    stroke: function(strokeStyle,lineWidth){
      if( lineWidth )
        ctx.lineWidth = lineWidth;
      if( strokeStyle )
        ctx.strokeStyle = strokeStyle;
      ctx.stroke()
      return draw;
    },
    fill: function(style){
      ctx.fillStyle = style
      ctx.fill()
      return draw;
    }
  }
  return draw;
}