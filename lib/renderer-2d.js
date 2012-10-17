
module.exports = Renderer;

var PADDLE_COLORS = ['#f00','#00f'];

function Renderer(canvas,bounds){
  this.bounds = bounds;
  this.canvas = canvas;
  this.context = canvas.getContext('2d');
  this.inverted = false;
  this.paddles = [];
  this.pointMasses = [];
  this.forces = [];
  this.stats = {
    bounds: 0,
    paddles: 0,
    forces: 0,
    pointMass: 0,
    links: 0
  }
}

Renderer.prototype = {
  invert: function(){
    this.inverted = !this.inverted;
  },

  within: function(pt){
    return this.bounds.within(pt);
  },

  drawPaddle: function(paddle,style){
    this.context.beginPath();
    this.context.moveTo(paddle.x-paddle.width/2,paddle.y);
    this.context.lineTo(paddle.x+paddle.width/2,paddle.y);
    this.context.closePath();
    this.context.strokeStyle = style;
    this.context.stroke();
    this.stats.paddles++;
  },

  drawBounds: function(){
    var x = this.bounds.l
      , y = this.bounds.t
      , w = this.bounds.r-this.bounds.l
      , h = this.bounds.b-this.bounds.t;
    this.context.beginPath();
    this.context.rect(x, y, w, h);
    this.context.closePath();
    this.context.stroke();
    this.stats.bounds++;
  },

  // Draw a gradient based on the type and mass of the force
  drawForce: function(force){
    // Create radial gradient
    var grad = this.context.createRadialGradient(force.x,force.y,0,force.x,force.y,force.mass/2); 
    if( force.type == 'repell' ){
      grad.addColorStop(0, 'rgba(255,0,0,1)');
      grad.addColorStop(1, 'rgba(255,0,0,0)');
    } else if( force.type == 'attract' ) {
      grad.addColorStop(0, 'rgba(0,255,0,1)');
      grad.addColorStop(1, 'rgba(0,255,0,0)');
    }
    this.context.fillStyle = grad;
    this.context.fillRect(force.x-force.mass/2,force.y-force.mass/2,force.mass,force.mass)
    this.stats.forces++;
  },
  
  drawPointMass: function(pointMass){
    this.context.beginPath();
    if( pointMass.links.length ){
      for(var i=0, l=pointMass.links.length; i < l; i++)
        this.drawLink(pointMass.links[i]);
    } else {
      this.context.rect(pointMass.current.x-1,pointMass.current.y-1,2,2)
    }
    this.context.closePath();
    this.context.stroke();
    this.stats.pointMass++;
  },

  drawLink: function(link){
    if( !link.hidden ){
      this.context.moveTo(link.a.current.x,link.a.current.y)
      this.context.lineTo(link.b.current.x,link.b.current.y)
      this.stats.links++;
    }
  },

  render: function(alpha){
    this.stats.paddles = 0
    this.stats.bounds = 0
    this.stats.forces = 0
    this.stats.pointMass = 0
    this.stats.links = 0

    // clear canvas
    this.canvas.width = this.canvas.width;
    
    // guest is flipped
    if( this.inverted ){
      this.context.translate(this.canvas.width/2,this.canvas.height/2)
      this.context.rotate(Math.PI)
      this.context.translate(-this.canvas.width/2,-this.canvas.height/2)
    }

    this.context.strokeStyle = '#000';
    for(var i=0, l=this.forces.length; i < l; i++)
      this.drawForce(this.forces[i]);

    for(var i=0, l=this.pointMasses.length; i < l; i++)
      this.drawPointMass(this.pointMasses[i]);

    this.drawBounds();

    for(var i=0, l=this.paddles.length; i < l; i++ )
      this.drawPaddle(this.paddles[i],PADDLE_COLORS[i]);
  }
}
