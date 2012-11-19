
module.exports = Renderer;

var PADDLE_COLORS = ['#f00','#00f'];

function Renderer(canvas){
  canvas.parentNode.className += ' renderer-2d';
  this.canvas = canvas;
  this.context = canvas.getContext('2d');
  this.inverted = false;
  this.stats = {}
}

Renderer.prototype = {

  reset: function(){},

  triggerEvent: function(){},

  changeView : function() { },

  activePlayer: function(id){
    this.inverted = id == 1;
  },

  swapVideoTexture: function(canvas){
    this.localVideo = canvas;
  },

  drawPaddle: function(ctx, paddle, style){
    drawPoly(ctx, paddle, this.w, this.h)
    ctx.strokeStyle = style;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    this.stats.paddles++;
  },

  drawBounds: function(ctx,bounds){
    drawPoly(ctx,bounds,1,1) // bounds are already scaled
    ctx.strokeStyle = 'green'
    ctx.stroke();
    this.stats.bounds++;
  },

  // Draw a gradient based on the type and mass of the force
  drawForce: function(ctx, force){
    var w = this.w
      , h = this.h
      , m = Math.sqrt(w*w+h*h);

    // Create radial gradient
    var grad = ctx.createRadialGradient(force.x*w,force.y*h,0,force.x*w,force.y*h,force.mass/2*m); 
    if( force.type == 'repell' ){
      grad.addColorStop(0, 'rgba(255,0,0,1)');
      grad.addColorStop(1, 'rgba(255,0,0,0)');
    } else if( force.type == 'attract' ) {
      grad.addColorStop(0, 'rgba(0,255,0,1)');
      grad.addColorStop(1, 'rgba(0,255,0,0)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(force.x*w-force.mass/2*m,force.y*h-force.mass/2*m,force.mass*m,force.mass*m)
    this.stats.forces++;
  },

  drawExtra: function(ctx, polygon){
    drawPoly(ctx,polygon,this.w,this.h)
    ctx.strokeStyle = 'blue'
    ctx.stroke();
    this.stats.extras++;
  },
  
  drawPointMass: function(ctx, pointMass){
    var w = this.w
      , h = this.h;
    if( pointMass.links.length ){
      ctx.beginPath();
      for(var i=0, l=pointMass.links.length; i < l; i++)
        this.drawLink(ctx, pointMass.links[i]);
      ctx.closePath();
      ctx.stroke();
    } else {
      var r = pointMass.radius || 5;
      ctx.fillRect(pointMass.current.x*w-r,pointMass.current.y*h-r,r+r,r+r)
    }
    this.stats.pointMass++;
  },

  drawLink: function(ctx, link){
    if( !link.hidden ){
      ctx.moveTo(link.a.current.x,link.a.current.y)
      ctx.lineTo(link.b.current.x,link.b.current.y)
      this.stats.links++;
    }
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

  render: function(world, alpha){
    this.stats.paddles = 0
    this.stats.bounds = 0
    this.stats.forces = 0
    this.stats.pucks = 0
    this.stats.extras = 0
    this.stats.links = 0


    var w = this.w = world.bounds.width
      , h = this.h = world.bounds.height
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

    for(var i=0, l=world.extras.length; i < l; i++)
      this.drawExtra(ctx,world.extras[i]);

    for(var i=0, l=world.pucks.length; i < l; i++)
      this.drawPointMass(ctx,world.pucks[i]);

    this.drawBounds(ctx,world.bounds);

    for(var i=0, l=world.paddles.length; i < l; i++ )
      this.drawPaddle(ctx,world.paddles[i],PADDLE_COLORS[i]);

  }
}


function drawPoly(ctx,polygon,w,h,withNormal,withIndex){
  ctx.beginPath();
  for( var i=0; i < polygon.edges.length; i++ ){
    var edge = polygon.edges[i];
    ctx.moveTo(edge.a.x*w,edge.a.y*h);
    ctx.lineTo(edge.b.x*w,edge.b.y*h);

    // draw the normal
    if( withNormal ){
      var mid = edge.a.clone().lerp(edge.b,.5);
      ctx.moveTo(mid.x*w,mid.y*h);
      ctx.lineTo(mid.x*w+edge.normal.x*100,mid.y*h+edge.normal.y*100)
    }
  }
  ctx.closePath();

  // write vertex index
  if( withIndex ){
    ctx.fillStyle = 'black'
    ctx.font = '2em courier'
    var t = ctx.measureText(polygon.vertices.length).width
    for( var i=0; i < polygon.vertices.length; i++ )
      ctx.fillText(i,polygon.vertices[i].x*w-t/2,polygon.vertices[i].y*h+10)
  }
}

