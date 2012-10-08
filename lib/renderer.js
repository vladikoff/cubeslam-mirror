
module.exports = Renderer;

function Renderer(canvas){
  this.pointMasses = [];
  this.canvas = canvas;
  this.context = canvas.getContext('2d');
  this.stats = {
    pointMass: 0,
    links: 0
  }
}

Renderer.prototype = {
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
  render: function(){
    this.stats.pointMass = 0
    this.stats.links = 0
    this.context.strokeStyle = '#000';
    for(var i=0, l=this.pointMasses.length; i < l; i++)
      this.drawPointMass(this.pointMasses[i]);
    this.context.stroke();
  }
}
