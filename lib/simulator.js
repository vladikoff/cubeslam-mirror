var Physics = require('./physics')
  , Renderer = require('./renderer-3d')
  , PointMass = require('./point-mass')
  , Force = require('./force')
  , Point = require('./point')
  , Rect = require('./rect')
  , Body = require('./body');

module.exports = Simulator;

function Simulator(canvas,form){
  this.form = form;
  this.width = canvas.width;
  this.height = canvas.height;
  this.bounds = new Rect(1,this.width-1,this.height-1,1);
  this.physics = new Physics();
  this.renderer = new Renderer(canvas);
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

  createPuck: function(){
    var puck = new PointMass(this.width/2,this.height/2);
    puck.bounds = this.bounds;
    this.puck = puck
    puck.applyForce(-10000,10000)
    this.pointMasses.push(puck);
  },

  createAttractor: function(pt,mass){
    var force = new Force('attract',pt);
    force.mass = mass || Math.round(100+Math.random()*200);
    if( this.host )
      this.channel.send('fa'+[pt.x,pt.y,force.mass,this.physics.frame].join(','));
    this.forces.push(force);
  },

  create: function(){
    // keep a list of pointMasses
    this.pointMasses = 
      this.physics.pointMasses = 
      this.renderer.pointMasses = [];

    this.forces = 
      this.physics.forces =
      this.renderer.forces = [];

    this.form.frame.value = this.physics.frame;
    this.reversed = this.form.reverse.checked;

    this.channel.onmessage = function(msg){
      console.log('onmessage',msg,this.physics.frame)

      // added attraction force
      if( msg[0] == 'f' && msg[1] == 'a' ){
        var data = msg.slice(2).split(',')
          , frame = +data.pop()
          , currentFrame = this.physics.frame;

        console.log('added attraction',data,frame,currentFrame)
        diffSim('before '+frame)

        this.physics.goto(frame)
        this.createAttractor(new Point(+data[0],+data[1]), +data[2]);
        diffSim('at '+frame)
        this.physics.goto(currentFrame)
        
        // assertSim()

        diffSim('after '+currentFrame)

      // reversed
      } if( msg[0] == 'r' ){
        var b = msg[1] == 't'
          , frame = +msg.slice(2)
          , currentFrame = this.physics.frame;

        console.log('reversed %s @%d',b,frame)

        this.physics.goto(frame);
        
        // update state (set reversed to `b`)
        if( this.reversed != b ){
          this.physics.reverse();
          this.reversed = this.form.reverse.checked = b;
        }

        this.physics.goto(currentFrame);

        
        // TODO next step is to:
        //      1. Store any actions that occurred since `lastFrame` (the last frame received from the channel)
        //      2. When playing back, include any actions that has occured during that frame.
      }
    }.bind(this)

    // this.createCurtain(60,40);
    // this.createBodies(25);
    this.createPuck();
  },

  destroy: function(){
    delete this.forces
    delete this.pointMasses
    delete this.renderer.forces
    delete this.renderer.pointMasses
    delete this.physics.pointMasses 
  },

  controls: function(inputs){
    if( this.form.paused.checked ) return;

    this.form.frame.value = this.physics.frame;
    this.form.speed.value = this.puck.velocity.length;

    if( this.form.reverse.checked != this.reversed ){
      this.physics.reverse();
      if( this.host )
        this.channel.send('r'+(this.form.reverse.checked?'t':'f')+this.form.frame.value)
      this.reversed = this.form.reverse.checked;
    }

    if( inputs.keyboard.d ){
      diffSim('diff @'+this.physics.frame);
    }

    if( inputs.mouse.up ){
      this.createAttractor(inputs.mouse);
    }

    inputs.reset();
  },
  
  update: function(dt,t){
    if( this.form.paused.checked ) return;
    this.physics.update(dt,t);
  },

  render: function(alpha){
    this.renderer.clear && this.renderer.clear()
    this.renderer.render(alpha)
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
