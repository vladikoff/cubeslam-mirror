var Physics = require('./sim/physics')
  , PointMass = require('./sim/point-mass')
  , Force = require('./sim/force')
  , Point = require('./sim/point')
  , Rect = require('./sim/rect')
  , Renderer = require('./renderer-2d')
  , Body = require('./body');

module.exports = Simulator;

function Simulator(canvas,form){
  this.form = form;
  this.width = canvas.width;
  this.height = canvas.height;
  this.bounds = new Rect(1,this.width-1,this.height-1,1);
  this.physics = new Physics();
  this.renderer = new Renderer(canvas,this.bounds);
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
    puck.onbounds = function(at){
      // TODO if `at` is on a paddle and `this.host` we send 'hit'
      if( at.y <= this.bounds.t ){
        var x = this.paddles[0].x
          , hw = this.paddles[0].width / 2;
        console.log('hit host',at.x,x-hw,x+hw)
        if( at.x >= x - hw && at.x <= x + hw ){
          console.log(' - paddle')

          // yay! we can do this together!
          if( this.host ){
            this.form.aliveScore.valueAsNumber++;
            this.channel.send('sa');

          }

        } else {
          console.log(' - wall')

          // oh noes!
          if( this.host ){
            this.form.hostScore.valueAsNumber += this.form.aliveScore.valueAsNumber;
            this.form.guestScore.valueAsNumber += this.form.aliveScore.valueAsNumber;
            this.form.aliveScore.value = 0;
            this.channel.send('sc');
          }

          // lost! tell the guest he scored 
          if( this.host ){
            this.form.guestScore.valueAsNumber++;
            this.channel.send('sg');

          // won! but don't add score unless host says so
          } else {

          }
        }
      } else if ( at.y >= this.bounds.b ){
        var x = this.paddles[1].x
          , hw = this.paddles[1].width / 2;
        console.log('hit guest',at.x,x-hw,x+hw)
        if( at.x >= x - hw && at.x <= x + hw ){
          console.log(' - paddle')

          // yay! we can do this together!
          if( this.host ){
            this.form.aliveScore.valueAsNumber++;
            this.channel.send('sa');

          }
        } else {
          console.log(' - wall')

          // oh noes!
          if( this.host ){
            this.form.hostScore.valueAsNumber += this.form.aliveScore.valueAsNumber;
            this.form.guestScore.valueAsNumber += this.form.aliveScore.valueAsNumber;
            this.form.aliveScore.value = 0;
            this.channel.send('sc');
          }

          // won! woohoo, add score and tell guest
          if( this.host ){
            this.form.hostScore.valueAsNumber++;
            this.channel.send('sh');

          // lost! but don't do anything...
          } else {

          }
        }
      }
    }.bind(this)
    puck.applyForce(-10000,10000)
    this.pointMasses.push(puck);
    this.puck = puck;
  },

  createPaddle: function(y){
    var paddle = new Point(this.width/2,y);
    paddle.width = 50;
    this.paddles.push(paddle);
  },

  createAttractor: function(pt,mass){
    var force = new Force('attract',pt);
    force.mass = mass || Math.round(100+Math.random()*200);
    if( this.host )
      this.channel.send('fa'+[pt.x,pt.y,force.mass,this.physics.frame].join(','));
    this.forces.push(force);
  },

  create: function(){
    this.pointMasses = 
      this.physics.pointMasses = 
      this.renderer.pointMasses = [];

    this.forces = 
      this.physics.forces =
      this.renderer.forces = [];

    this.paddles = 
      this.physics.paddles = 
      this.renderer.paddles = [];

    this.form.frame.value = this.physics.frame;
    this.reversed = this.form.reverse.checked;

    // highlight "me"
    if( this.host )
      this.form.hostScore.parentNode.style.border = 'solid 3px green';
    else 
      this.form.guestScore.parentNode.style.border = 'solid 3px green';

    this.channel.onmessage = function(e){
      var msg = e.data;
      console.log('onmessage',msg,this.physics.frame)

        
      // TODO next step is to:
      //      1. Store any actions that occurred since `lastFrame` (the last frame received from the channel)
      //      2. When playing back, include any actions that has occured during that frame.



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
      } else if( msg[0] == 'r' ){
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

      // paddle movement
      } else if( msg[0] == 'p' ){
        var x = +msg.slice(1);

        var paddleIndex = this.host ? 1 : 0;
        this.paddles[paddleIndex].x = x;

      // scoring
      } else if( msg[0] == 's' ){

        switch( msg[1] ){
          // guest scored
          case 'g': this.form.guestScore.valueAsNumber++; break;

          // host scored
          case 'h': this.form.hostScore.valueAsNumber++; break;

          // alive scored!
          case 'a': this.form.aliveScore.valueAsNumber++; break;

          // alive reset :(
          case 'c': 
            this.form.hostScore.valueAsNumber += this.form.aliveScore.valueAsNumber;
            this.form.guestScore.valueAsNumber += this.form.aliveScore.valueAsNumber;
            this.form.aliveScore.value = 0; break;

          default:
            console.warn('invalid scorer',msg)
        }

      // catch-all
      } else {
        console.warn('undefined command:',msg)
      }

    }.bind(this)

    // this.createCurtain(60,40);
    // this.createBodies(25);
    this.createPuck();
    this.createPaddle(this.bounds.t);
    this.createPaddle(this.bounds.b);

    if( !this.host )
      this.renderer.invert()
  },

  destroy: function(){
    delete this.puck
    delete this.forces
    delete this.paddles
    delete this.pointMasses
    delete this.physics.forces
    delete this.physics.paddles
    delete this.physics.pointMasses 
    delete this.renderer.forces
    delete this.renderer.paddles
    delete this.renderer.pointMasses
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

    if( this.renderer.within(inputs.mouse) ){
      // only the host can create attractors
      if( this.host && inputs.mouse.up ) 
        this.createAttractor(inputs.mouse);

      if( inputs.mouse.moved ){
        var paddleIndex = this.host ? 0 : 1
          , inverted =  this.host ? !!this.renderer.scene : !this.renderer.scene;

        // inverted when 3d or host
        if( inverted )
          this.paddles[paddleIndex].x = (this.bounds.r-this.bounds.l)-inputs.mouse.x;
        else
          this.paddles[paddleIndex].x = inputs.mouse.x;

        if( this.physics.frame % 3 == 0 )
          this.channel.send('p'+this.paddles[paddleIndex].x)
      }
    }

    inputs.reset()
  },
  
  update: function(dt,t){
    if( this.form.paused.checked ) return;
    this.physics.update(dt,t);
  },

  render: function(alpha){
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
