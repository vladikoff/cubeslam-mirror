var PointMass = require('./sim/point-mass');


module.exports = Body;

/*
   O
  /|\
 / | \
  / \
 |   |
*/

function Body (x, y, bodyHeight) {
  var headLength = bodyHeight / 7.5
    , headWidth = headLength * 3/4;

  var head = new PointMass(x + random(-5,5),y + random(-5,5), 4);
  var shoulder = new PointMass(x + random(-5,5),y + random(-5,5), 26);
  head.attachTo(shoulder, 5/4 * headLength, 1, bodyHeight*2);
  
  var elbowLeft = new PointMass(x + random(-5,5),y + random(-5,5), 2);
  var elbowRight = new PointMass(x + random(-5,5),y + random(-5,5) , 2);
  elbowLeft.attachTo(shoulder, headLength*3/2, 1, bodyHeight*2);
  elbowRight.attachTo(shoulder, headLength*3/2, 1, bodyHeight*2);
  
  var handLeft = new PointMass(x + random(-5,5),y + random(-5,5), 2);
  var handRight = new PointMass(x + random(-5,5),y + random(-5,5), 2);
  handLeft.attachTo(elbowLeft, headLength*2, 1, bodyHeight*2);
  handRight.attachTo(elbowRight, headLength*2, 1, bodyHeight*2);
  
  var pelvis = new PointMass(x + random(-5,5),y + random(-5,5), 15);
  pelvis.attachTo(shoulder,headLength*3.5,0.8,bodyHeight*2);

  // this restraint keeps the head from tilting in extremely uncomfortable positions
  pelvis.attachTo(head, headLength*4.75, 0.02, bodyHeight*2).hidden = true;
  
  var kneeLeft = new PointMass(x + random(-5,5),y + random(-5,5), 10);
  var kneeRight = new PointMass(x + random(-5,5),y + random(-5,5), 10);
  kneeLeft.attachTo(pelvis, headLength*2, 1, bodyHeight*2);
  kneeRight.attachTo(pelvis, headLength*2, 1, bodyHeight*2);
  
  var footLeft = new PointMass(x + random(-5,5),y + random(-5,5), 5);
  var footRight = new PointMass(x + random(-5,5),y + random(-5,5), 5);
  footLeft.attachTo(kneeLeft, headLength*2, 1, bodyHeight*2);
  footRight.attachTo(kneeRight, headLength*2, 1, bodyHeight*2);
  
  // these constraints resist flexing the legs too far up towards the body
  footLeft.attachTo(shoulder, headLength*7.5, 0.001, bodyHeight*2).hidden = true;
  footRight.attachTo(shoulder, headLength*7.5, 0.001, bodyHeight*2).hidden = true;
  
  // TODO
  // headCircle = new Circle(headLength*0.75);
  // headCircle.attachToPointMass(head);
  
  this.head = head;
  this.shoulder = shoulder;
  this.pelvis = pelvis;
  this.elbowLeft = elbowLeft;
  this.elbowRight = elbowRight;
  this.handLeft = handLeft;
  this.handRight = handRight;
  this.kneeLeft = kneeLeft;
  this.kneeRight = kneeRight;
  this.footLeft = footLeft;
  this.footRight = footRight;
}

Body.prototype.setBounds = function(bounds){
  this.head.bounds = bounds;
  this.shoulder.bounds = bounds;
  this.pelvis.bounds = bounds;
  this.elbowLeft.bounds = bounds;
  this.elbowRight.bounds = bounds;
  this.handLeft.bounds = bounds;
  this.handRight.bounds = bounds;
  this.kneeLeft.bounds = bounds;
  this.kneeRight.bounds = bounds;
  this.footLeft.bounds = bounds;
  this.footRight.bounds = bounds;
}

Body.prototype.addToWorld = function(world){
  world.push(this.head);
  world.push(this.shoulder);
  world.push(this.pelvis);
  world.push(this.elbowLeft);
  world.push(this.elbowRight);
  world.push(this.handLeft);
  world.push(this.handRight);
  world.push(this.kneeLeft);
  world.push(this.kneeRight);
  world.push(this.footLeft);
  world.push(this.footRight);

  // TODO
  // physics.addCircle(headCircle);
}

Body.prototype.removeFromWorld = function(world){
  function rem(x){ var i=world.indexOf(x); ~i && world.splice(i,1); }
  rem(this.head);
  rem(this.shoulder);
  rem(this.pelvis);
  rem(this.elbowLeft);
  rem(this.elbowRight);
  rem(this.handLeft);
  rem(this.handRight);
  rem(this.kneeLeft);
  rem(this.kneeRight);
  rem(this.footLeft);
  rem(this.footRight);
}


function random(min,max){
  return min + Math.random()*(max-min);
}