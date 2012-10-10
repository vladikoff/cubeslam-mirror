
module.exports = Renderer;

function Renderer(canvas){
  this.pointMasses = [];
  this.attractors = [];
  this.canvas = canvas;
  this.context = canvas.getContext('2d');
  this.stats = {
    attractors: 0,
    pointMass: 0,
    links: 0
  }
}

Renderer.prototype = {
  // Draw a gradient based on the mass of the attractor
  drawAttractor: function(attr){
    // Create radial gradient
    var grad = this.context.createRadialGradient(attr.x,attr.y,0,attr.x,attr.y,attr.mass/2); 
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    this.context.fillStyle = grad;
    this.context.fillRect(attr.x-attr.mass/2,attr.y-attr.mass/2,attr.mass,attr.mass)
    this.stats.attractors++;
  },
  drawPointMass: function(pointMass){
    if( pointMass.links.length ){
      for(var i=0, l=pointMass.links.length; i < l; i++)
        this.drawLink(pointMass.links[i]);
    } else {
      this.context.rect(pointMass.current.x-1,pointMass.current.y-1,2,2)
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
  clear: function(){
    this.canvas.width = this.canvas.width;
  },
  render: function(alpha){
    this.stats.attractors = 0
    this.stats.pointMass = 0
    this.stats.links = 0
    
    for(var i=0, l=this.attractors.length; i < l; i++)
      this.drawAttractor(this.attractors[i]);

    this.context.strokeStyle = '#000';
    for(var i=0, l=this.pointMasses.length; i < l; i++)
      this.drawPointMass(this.pointMasses[i]);
    this.context.stroke();
  }
}
