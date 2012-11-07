
module.exports = Renderer;

var PADDLE_COLORS = ['#f00','#00f'];

function Renderer(canvas,bounds){
  canvas.parentNode.className += ' renderer-2d';
  this.bounds = bounds;
  this.canvas = canvas;
  this.context = canvas.getContext('2d');
  this.inverted = false;
  this.stats = {
    bounds: 0,
    paddles: 0,
    forces: 0,
    pucks: 0,
    links: 0
  }
}

Renderer.prototype = {
  invert: function(){
    this.inverted = !this.inverted;
  },

  setVideoTexture: function(canvas){
    this.localVideo = canvas;
  },

  drawPaddle: function(paddle,style){
    var w = this.bounds.r-this.bounds.l
      , h = this.bounds.b-this.bounds.t;
    this.context.beginPath();
    this.context.moveTo(paddle.x*w-(paddle.width*w)/2,paddle.y*h);
    this.context.lineTo(paddle.x*w+(paddle.width*h)/2,paddle.y*h);
    this.context.closePath();
    this.context.strokeStyle = style;
    this.context.lineWidth = 3.5;
    this.context.stroke();
    this.stats.paddles++;
  },

  drawBounds: function(){
    var x = this.bounds.l
      , y = this.bounds.t
      , w = (this.bounds.r-this.bounds.l)
      , h = (this.bounds.b-this.bounds.t);
    this.context.beginPath();
    this.context.rect(x, y, w, h);
    this.context.closePath();
    this.context.stroke();
    this.stats.bounds++;
  },

  // Draw a gradient based on the type and mass of the force
  drawForce: function(force){
    var w = this.bounds.r-this.bounds.l
      , h = this.bounds.b-this.bounds.t
      , m = Math.sqrt(w*w+h*h);

    // Create radial gradient
    var grad = this.context.createRadialGradient(force.x*w,force.y*h,0,force.x*w,force.y*h,force.mass/2*m); 
    if( force.type == 'repell' ){
      grad.addColorStop(0, 'rgba(255,0,0,1)');
      grad.addColorStop(1, 'rgba(255,0,0,0)');
    } else if( force.type == 'attract' ) {
      grad.addColorStop(0, 'rgba(0,255,0,1)');
      grad.addColorStop(1, 'rgba(0,255,0,0)');
    }
    this.context.fillStyle = grad;
    this.context.fillRect(force.x*w-force.mass/2*m,force.y*h-force.mass/2*m,force.mass*m,force.mass*m)
    this.stats.forces++;
  },
  
  drawPointMass: function(pointMass){
    var w = this.bounds.r-this.bounds.l
      , h = this.bounds.b-this.bounds.t;
    if( pointMass.links.length ){
      this.context.beginPath();
      for(var i=0, l=pointMass.links.length; i < l; i++)
        this.drawLink(pointMass.links[i]);
      this.context.closePath();
      this.context.stroke();
    } else {
      var r = pointMass.radius || 5;
      this.context.fillRect(pointMass.current.x*w-r,pointMass.current.y*h-r,r+r,r+r)
    }
    this.stats.pointMass++;
  },

  drawLink: function(link){
    if( !link.hidden ){
      this.context.moveTo(link.a.current.x,link.a.current.y)
      this.context.lineTo(link.b.current.x,link.b.current.y)
      this.stats.links++;
    }
  },

  drawCorners: function(){
    this.context.font = '1.5em courier'
    this.context.fillStyle = 'black'
    var t = this.context.measureText('0/0')
      , w = this.bounds.r-this.bounds.l-t.width
      , h = this.bounds.b-this.bounds.t;
    this.context.fillText('0/0',0,20)
    this.context.fillText('1/0',w,20)
    this.context.fillText('0/1',0,h)
    this.context.fillText('1/1',w,h)
  },

  render: function(world, alpha){
    this.stats.paddles = 0
    this.stats.bounds = 0
    this.stats.forces = 0
    this.stats.pucks = 0
    this.stats.links = 0


    var w = this.bounds.r-this.bounds.l
      , h = this.bounds.b-this.bounds.t
      , margin = 50 // room for drawing corner positions
      , scale = .25;

    // clears canvas and makes sure it stays with the bounds (w. margin)
    this.canvas.width = (w+margin)*scale;
    this.canvas.height = (h+margin)*scale;
    
    // guest is flipped
    if( this.inverted ){
      this.context.translate(this.canvas.width/2,this.canvas.height/2)
      this.context.rotate(Math.PI)
      this.context.translate(-this.canvas.width/2,-this.canvas.height/2)
    }

    // scale it down because 800x1600 is huge...
    this.context.scale(scale,scale)

    // move everything in
    this.context.translate(margin/2,margin/2)

    // draw some text at the corners
    this.drawCorners()

    // draw the video in the background 
    if( this.localVideo )
      this.context.drawImage(this.localVideo,0,0);

    this.context.strokeStyle = '#000';
    for(var i=0, l=world.forces.length; i < l; i++)
      this.drawForce(world.forces[i]);

    for(var i=0, l=world.pucks.length; i < l; i++)
      this.drawPointMass(world.pucks[i]);

    this.drawBounds();

    for(var i=0, l=world.paddles.length; i < l; i++ )
      this.drawPaddle(world.paddles[i],PADDLE_COLORS[i]);

  }
}
