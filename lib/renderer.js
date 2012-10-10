
module.exports = Renderer;

function Renderer(canvas){
  this.pointMasses = [];
  this.forces = [];
  this.canvas = canvas;
  this.context = canvas.getContext('2d');
  this.stats = {
    forces: 0,
    pointMass: 0,
    links: 0
  }
}

Renderer.prototype = {
  // Draw a gradient based on the type and mass of the force
  drawForce: function(force){
    // Create radial gradient
    var grad = this.context.createRadialGradient(force.x,force.y,0,force.x,force.y,force.mass/2); 
    if( force.type == 'attract' ){
      grad.addColorStop(0, 'rgba(1,0,0,1)');
      grad.addColorStop(1, 'rgba(1,0,0,0)');
    } else if( force.type == 'repell' ) {
      grad.addColorStop(0, 'rgba(0,1,0,1)');
      grad.addColorStop(1, 'rgba(0,1,0,0)');
    }
    this.context.fillStyle = grad;
    this.context.fillRect(force.x-force.mass/2,force.y-force.mass/2,force.mass,force.mass)
    this.stats.forces++;
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
    this.stats.forces = 0
    this.stats.pointMass = 0
    this.stats.links = 0
    
    for(var i=0, l=this.forces.length; i < l; i++)
      this.drawForce(this.forces[i]);

    this.context.strokeStyle = '#000';
    for(var i=0, l=this.pointMasses.length; i < l; i++)
      this.drawPointMass(this.pointMasses[i]);
    this.context.stroke();
  }
}
