
var Point = require('./point')


module.exports = Inputs;


function Inputs(){
  this.mouse = new Point();
  this.mouse.last = new Point();
  this.touches = [];
  this.keyboard = {};
  this.forms = [];

  var inputs = this;

  if( document ){
    // handle browser mouse events
    document.addEventListener('mousedown', function(e){
      inputs.onmousedown(e);
    }, false);
    document.addEventListener('mousemove', function(e) {
      inputs.onmousemove(e);
    }, false);
    document.addEventListener('mouseup', function(e){
      inputs.onmouseup(e);
    }, false);

    // handle browser keyboard events
    document.addEventListener('keydown', function(e){
      inputs.onkeydown(e);
    }, false);
    document.addEventListener('keyup', function(e) {
      inputs.onkeyup(e);
    }, false);

    // handle browser form elements
    this.form = {};
    for(var f=0; f < document.forms.length; f++){
      var form = document.forms[f];
      for(var e=0; e < form.elements.length; e++){
        var element = form.elements[e];

        console.log(element.nodeName,element.type,element.name)

        // TODO add listeners to elements
        switch(element.nodeName.toLowerCase()){
          case 'button':
            element.addEventListener('mousedown',function(e){
              e.stopImmediatePropagation();
              e.preventDefault();
              inputs.onbuttondown(e,element);
            },false)
            element.addEventListener('mouseup',function(e){
              e.stopImmediatePropagation();
              e.preventDefault();
              inputs.onbuttonup(e,element);
            },false)
            break;
        }
      }
    }
  }
}

Inputs.prototype.pressed = function(key){
  if( /(\w+) (\w+)/.exec(key) ){
    var type = RegExp.$1
      , name = RegExp.$2;
    return this[type][name];
  }
}

Inputs.prototype.onbuttondown = function(e,element){
  this.form[element.name] = true;
}
Inputs.prototype.onbuttonup = function(e,element){
  this.form[element.name] = false;
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
Inputs.prototype.onkeydown = function(e){
  var k = String.fromCharCode(e.which).toLowerCase();
  this.keyboard[k] = true;
}
Inputs.prototype.onkeyup = function(e){
  var k = String.fromCharCode(e.which).toLowerCase();
  this.keyboard[k] = false;
}


Inputs.prototype.reset = function(){
  this.mouse.up = false;
  this.mouse.down = false;

  for(var key in this.keyboard)
    delete this.keyboard[key];
}