module.exports = Point;


function Point(x,y){
  if( !(this instanceof Point) )
    return new Point(x,y);
  if( typeof x == 'object' )
    y = x.y, x = x.x;
  this.x = x || 0;
  this.y = y || 0;
}

Point.prototype = {

  set: function(x,y){
    // pt.set(pt2);
    if( x instanceof Point ){
      this.x = x.x;
      this.y = x.y;

    // pt.set(2)
    } else if( arguments.length == 1 ){
      this.x = x;
      this.y = x;

    // pt.set(2,4)
    } else if( arguments.length == 2 ){
      this.x = x;
      this.y = y;

    } else {
      throw new Error('invalid arguments');
    }
    return this//.validate();
  },

  add: function(x,y){
    // pt.add(pt2);
    if( x instanceof Point ){
      this.x += x.x;
      this.y += x.y;

    // pt.add(2)
    } else if( arguments.length == 1 ){
      this.x += x;
      this.y += x;

    // pt.add(2,4)
    } else if( arguments.length == 2 ){
      this.x += x;
      this.y += y;

    } else {
      throw new Error('invalid arguments');
    }
    return this//.validate();
  },

  sub: function(x,y){
    // pt.sub(pt2);
    if( x instanceof Point ){
      this.x -= x.x;
      this.y -= x.y;

    // pt.sub(2)
    } else if( arguments.length == 1 ){
      this.x -= x;
      this.y -= x;

    // pt.sub(2,4)
    } else if( arguments.length == 2 ){
      this.x -= x;
      this.y -= y;

    } else {
      throw new Error('invalid arguments');
    }
    return this//.validate();
  },

  mul: function(x,y){
    // pt.mul(pt2);
    if( x instanceof Point ){
      this.x *= x.x;
      this.y *= x.y;

    // pt.mul(2)
    } else if( arguments.length == 1 ){
      this.x *= x;
      this.y *= x;

    // pt.mul(2,4)
    } else if( arguments.length == 2 ){
      this.x *= x;
      this.y *= y;

    } else {
      throw new Error('invalid arguments');
    }
    return this//.validate();
  },

  div: function(x,y){
    // pt.div(pt2);
    if( x instanceof Point ){
      this.x /= x.x;
      this.y /= x.y;

    // pt.div(2)
    } else if( arguments.length == 1 ){
      this.x /= x;
      this.y /= x;

    // pt.div(2,4)
    } else if( arguments.length == 2 ){
      this.x /= x;
      this.y /= y;

    } else {
      throw new Error('invalid arguments');
    }
    return this//.validate();
  },

  get length(){
    return Math.sqrt(this.x * this.x + this.y * this.y);
  },

  reset: function(){
    this.x = 0;
    this.y = 0;
    return this//.validate();
  },

  clone: function(){
    return new Point(this.x,this.y);
  },

  copy: function(pt){
    if( pt ){
      this.x = pt.x || this.x;
      this.y = pt.y || this.y;
    }
    return this//.validate();
  },

  validate: function(){
    if( typeof this.x != 'number' )
      throw new Error('invalid x:'+this.x)
    if( typeof this.y != 'number' )
      throw new Error('invalid y:'+this.y)
    return this;
  },

  toString: function(){
    return '('+this.x+','+this.y+')';
  }

}

// aliases
Point.prototype.multiply = Point.prototype.mul;
Point.prototype.subtract = Point.prototype.sub;
Point.prototype.divide   = Point.prototype.div;

Point.polar = function(angle,length){
  var toRadian = Math.PI/180;
  return new Point(
    Math.sin(angle*toRadian)*length,
    Math.cos(angle*toRadian)*length
  );
}

Point.distance = function(a,b){
  return Point.diff(a,b).length;
}

Point.diff = function(a,b){
  return new Point(b.x-a.x,b.y-a.y);
}