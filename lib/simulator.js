var Physics = require('./sim/physics')
  , PointMass = require('./sim/point-mass')
  , Force = require('./sim/force')
  , Point = require('./sim/point')
  , Rect = require('./sim/rect')
  , Renderer = require('./renderer-3d')
  , Body = require('./body');

module.exports = Simulator;

function Simulator(canvas,form){
  this.form = form;
  this.width = canvas.width;
  this.height = canvas.height;
  this.bounds = new Rect(1,this.width-1,this.height-1,1);
  this.physics = new Physics();
  this.renderer = new Renderer(canvas,this.bounds);
  this.actions = Object.create(Actions);
  this.actions.create = Actions.create.bind(this);
  this.actions.destroy = Actions.destroy.bind(this);
  this.actions.createAt = Actions.createAt.bind(this);

  // for singleplayer
  this.host = true;
  this.channel = {send: function(){}}; 
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
            this.actions.create(Actions.SCORE_ALIVE)

          }

        } else {
          console.log(' - wall')

          // oh noes!
          if( this.host ){
            this.actions.create(Actions.SCORE_RESET)
          }

          // lost! tell the guest he scored 
          if( this.host ){
            this.actions.create(Actions.SCORE_GUEST)

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
            this.actions.create(Actions.SCORE_ALIVE)

          }
        } else {
          console.log(' - wall')

          // oh noes!
          if( this.host ){
            this.actions.create(Actions.SCORE_RESET)

          }

          // won! woohoo, add score and tell guest
          if( this.host ){
            this.actions.create(Actions.SCORE_HOST)

          // lost! but guests get this in a message
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

    if( this.channel ){
      this.channel.onmessage = function(e){
        var msg = e.data;
        console.log('onmessage',msg,this.physics.frame)

        this.actions.parse(e.data);
          
        // TODO next step is to:
        //      1. Store any actions that occurred since `lastFrame` (the last frame received from the channel)
        //      2. When playing back, include any actions that has occured during that frame.

      }.bind(this)
    }

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
      this.actions.create(Actions.REVERSE);
    }

    if( inputs.keyboard.d ){
      diffSim('diff @'+this.physics.frame);
    }

    if( this.renderer.within(inputs.mouse) ){
      // only the host can create attractors
      if( this.host && inputs.mouse.up ){ 
        if( Math.random() > .5 )
          this.actions.create(Actions.FORCE_ATTRACT,inputs.mouse.x,inputs.mouse.y);
        else
          this.actions.create(Actions.FORCE_REPELL,inputs.mouse.x,inputs.mouse.y);
      }

      if( inputs.mouse.moved ){
        var paddleIndex = this.host ? 0 : 1
          , inverted =  this.host ? !!this.renderer.scene : !this.renderer.scene;
        this.actions.create(Actions.PADDLE_MOVE,paddleIndex,inverted,inputs.mouse.x);

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


var Actions = {

  // Forces
  FORCE_ATTRACT: 'fa',
  FORCE_REPELL:  'fr',

  // Scores
  SCORE_HOST:    'sh',
  SCORE_GUEST:   'sg',
  SCORE_ALIVE:   'sa',
  SCORE_RESET:   'sr',

  // Movement
  PADDLE_MOVE:   'p',

  REVERSE:       'r',

  create: function(type /*, ...*/){
    var send = this.host
      , opts = [].slice.call(arguments,1);

    switch(type){
      case Actions.FORCE_REPELL:  // x, y, mass
        var kind = 'repell';

      case Actions.FORCE_ATTRACT: // x, y, mass
        var x = +opts[0]
          , y = +opts[1]
          , pt = new Point(x,y)
          , mass = +opts[2]
          , kind = kind || 'attract';

        var force = new Force(kind,pt);
        force.mass = mass || Math.round(100+Math.random()*200);
        this.forces.push(force);
        break;


      case Actions.SCORE_ALIVE:
        this.form.aliveScore.valueAsNumber++;
        break;

      case Actions.SCORE_GUEST:
        this.form.guestScore.valueAsNumber++;
        break;

      case Actions.SCORE_HOST:
        this.form.hostScore.valueAsNumber++;
        break;

      case Actions.SCORE_RESET:
        this.form.hostScore.valueAsNumber += this.form.aliveScore.valueAsNumber;
        this.form.guestScore.valueAsNumber += this.form.aliveScore.valueAsNumber;
        this.form.aliveScore.value = 0;
        break;

      case Actions.PADDLE_MOVE:  // paddleIndex, inverted, x
        var paddleIndex = +opts[0]
          , inverted = !!opts[1]
          , x = +opts[2];

        // inverted when 3d or host
        if( inverted )
          this.paddles[paddleIndex].x = (this.bounds.r-this.bounds.l)-x;
        else
          this.paddles[paddleIndex].x = x;

        send = this.physics.frame % 3 == 0; // TODO mark as unimportant (if already in buffer, remove it)
        break;

      case Actions.REVERSE:  // checked
        this.physics.reverse();
        this.reversed = this.form.reverse.checked;
        opts.push(this.form.reverse.checked?'1':'0')
        break;

      default:
        console.warn('undefined action:',type,arguments)
        send = false;

    }

    // if host, send a serialized action on this.channel
    // TODO buffer and send at specified interval (1/30?)
    if( send )
      this.channel.send([type,this.physics.frame,opts.join(',')].join('#'));
  },

  parse: function(msg){
    var RE_ACTION = /(\w{1,2})#(\d+#)?(.+)$/g
    while( RE_ACTION.exec(msg) ){
      var type = RegExp.$1
        , frame = +RegExp.$2
        , opts = RegExp.$3.split(',');

      if( frame )
        this.createAt.apply(this,[frame,type].concat(opts))
      else
        this.create.apply(this,[type].concat(opts))
    }
  },

  createAt: function(frame, type /*, ...*/){
    var currentFrame = this.physics.frame;
    this.physics.goto(frame)
    this.create.apply(this,[].slice.call(arguments,1))
    this.physics.goto(currentFrame)
  },

  destroy: function(effect){

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
