var geom = require('geom')
  , poly = geom.poly
  , vec = geom.vec;

module.exports = function(ctx){
  return new Draw(ctx);
}

function Draw(ctx){
  this.ctx = ctx;
}

Draw.prototype = {
  clear: function(){
    this.ctx.clearRect(0,0,canvas.width,canvas.height)
  },
  poly: function(p){
    this.ctx.beginPath();
    var v = p.vertices[0]
      , x = v[0]
      , y = v[1];

    for(var i=0; i < p.edges.length; i++){
      var e = p.edges[i];
      this.ctx.moveTo(x,y)
      this.ctx.lineTo(x+e[0],y+e[1]);

      // draw normal
      var n = vec.perp(e)
      vec.norm(n,n)
      var m = vec.lerp([x,y],[x+e[0],y+e[1]],.5)
      this.ctx.moveTo(m[0],m[1])
      this.ctx.lineTo(m[0]+n[0]*5,m[1]+n[1]*5)

      // draw index
      this.ctx.font = '3px courier'
      var t = this.ctx.measureText(i).width;
      this.ctx.fillText(i,m[0]-t/2,m[1])

      // free the vectors
      vec.free(n)
      vec.free(m)

      x += e[0]
      y += e[1];
    }
    this.ctx.closePath();

    // draw centroid
    var c = poly.centroid(p)
    this.ctx.fillRect(c[0]-1,c[1]-1,2,2)
    vec.free(c)

    return this;
  },
  line: function(S){
    var a = S[0], b = S[1];
    this.ctx.beginPath();
    this.ctx.moveTo(a[0],a[1])
    this.ctx.lineTo(b[0],b[1])
    this.ctx.closePath();
    return this;
  },
  rect: function(r){ // [t,r,b,l]
    this.ctx.beginPath();
    this.ctx.rect(r[0],r[3],r[1]-r[3],r[2]-r[0]);
    this.ctx.closePath();
    return this;
  },
  point: function(a,r){
    r = r || 1
    this.ctx.beginPath();
    this.ctx.rect(a[0]-r,a[1]-r,r+r,r+r);
    this.ctx.closePath();
    return this;
  },
  stroke: function(strokeStyle,lineWidth){
    if( lineWidth )
      this.ctx.lineWidth = lineWidth;
    if( strokeStyle )
      this.ctx.strokeStyle = strokeStyle;
    this.ctx.stroke()
    return this;
  },
  fill: function(fillStyle){
    if( fillStyle )
      this.ctx.fillStyle = fillStyle;
    this.ctx.fill()
    return this;
  }
}