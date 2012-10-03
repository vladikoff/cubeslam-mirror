
var Point = require('./point')


module.exports = Inputs;


function Inputs(){
  this.mouse = new Point();
  this.mouse.last = new Point();
  this.touches = [];
  this.keyboard = {};

  var inputs = this;

  // handle browser mouse events
  if( document ){
    document.addEventListener('mousedown', function(e){
      e.preventDefault();
      inputs.onmousedown(e);
    }, false);
    document.addEventListener('mousemove', function(e) {
      e.preventDefault();
      inputs.onmousemove(e);
    }, false);
    document.addEventListener('mouseup', function(e){
      e.preventDefault();
      inputs.onmouseup(e);
    }, false);
  }
}


Inputs.prototype.onmousedown = function(e){
  this.mouse.down = true;
  this.mouse.up = false;
}
Inputs.prototype.onmouseup = function(e){
  this.mouse.down = false;
  this.mouse.up = true;
}
Inputs.prototype.onmousemove = function(e){
  this.mouse.last.set(this.mouse);
  this.mouse.set(e.offsetX,e.offsetY);
}
