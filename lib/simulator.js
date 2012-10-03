var Physics = require('./physics')
  , Renderer = require('./renderer')
  , PointMass = require('./point-mass')
  , Point = require('./point')
  , Rect = require('./rect')
  , Body = require('./body');

module.exports = Simulator;

function Simulator(canvas){
  this.width = canvas.width;
  this.height = canvas.height;
  this.bounds = new Rect(0,this.width,this.height,0);
  this.physics = new Physics();
  this.renderer = new Renderer(canvas);
  this.reset();
}

Simulator.prototype = {

  createCurtain: function(width,height){
    var restingDistances = 6;
    var stiffnesses = 1;
    var curtainTearSensitivity = 50;

    var startY = 25;
    var midWidth = (this.width/2 - (width*restingDistances)/2);
    
    for(var y=0; y <= height; y++){
      for(var x=0; x <= width; x++){
        var pointMass = new PointMass(midWidth + x * restingDistances, y * restingDistances + startY);

        if( x != 0 )
          pointMass.attachTo(this.pointMasses[this.pointMasses.length-1], restingDistances, stiffnesses, curtainTearSensitivity);

        if( y != 0 )
          pointMass.attachTo(this.pointMasses[(y-1) * (width+1) + x], restingDistances, stiffnesses, curtainTearSensitivity);

        if( y == 0 )
          pointMass.pinTo(pointMass.current.x,pointMass.current.y)

        pointMass.bounds = this.bounds;
        this.pointMasses.push(pointMass);
      }
    }
  },

  createBodies: function(num){
    var bodyHeight = 40;

    for(var i=0; i < num; i++){
      var bodyX = Math.random()*this.width
        , bodyY = Math.random()*this.height
        , body = new Body(bodyX, bodyY, bodyHeight);

      body.setBounds(this.bounds);
      body.addToWorld(this.pointMasses);
    }
  },

  reset: function(){
    // keep a list of pointMasses
    this.pointMasses = 
      this.physics.pointMasses = 
      this.renderer.pointMasses = [];

    this.createCurtain(50,25);
    this.createBodies(25);
  },

  controls: function(inputs){
    this.pointMasses.forEach(function(pointMass){

      // Add gravity to all pointmasses
      pointMass.applyForce(0,980);

      // TODO Add other forces to all pointmasses?

      if( inputs.mouse.down ){
        // every PointMass within this many pixels will be influenced by the cursor
        var mouseInfluenceSize = 20*20; // squared 
        var mouseInfluenceScalar = 2;
        var distSquared = distPointToSegmentSquared(inputs.mouse.last,inputs.mouse,pointMass.current);
        if( distSquared < mouseInfluenceSize ){
          // To change the velocity of our PointMass, we subtract that change from the lastPosition.
          // When the physics gets integrated (see updatePhysics()), the change is calculated
          // Here, the velocity is set equal to the cursor's velocity
          pointMass.previous.set(
            pointMass.current.x - (inputs.mouse.x-inputs.mouse.last.x) * mouseInfluenceScalar,
            pointMass.current.y - (inputs.mouse.y-inputs.mouse.last.y) * mouseInfluenceScalar
          )
        }
      }
    })
  },
  
  update: function(dt,t){
    this.physics.update(dt);
  },

  render: function(){
    this.renderer.clear()
    this.renderer.render()
  }

}


// Using http://www.codeguru.com/forum/showpost.php?p=1913101&postcount=16
// We use this to have consistent interaction
// so if the cursor is moving fast, it won't interact only in spots where the applet registers it at
function distPointToSegmentSquared(a, b, c){
  // line1 = a
  // line2 = b
  // point = c
  var v = Point.diff(c,a)
    , u = Point.diff(b,a)
    , len = u.x*u.x + u.y*u.y
    , det = (-v.x * u.x) + (-v.y * u.y);

  if( det < 0 || det > len ){
    u.set(b.x-c.x,b.y-c.y);
    return Math.min(v.x*v.x + v.y*v.y,u.x*u.x + u.y*u.y)
  }

  det = u.x*v.y - u.y*v.x;
  return (det*det) / len;
}

