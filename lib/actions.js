var Force = require('./sim/force')
  , Point = require('./sim/point')
  , PointMass = require('./sim/point-mass')
  , Rect = require('./sim/rect')
  , diff = require('./support/diff')
  , inspect = require('./support/inspect')
  , audio = require('./audio')
  , debug = require('debug')('actions')
  

module.exports = Actions;

function Actions(to){
  var actions = Object.create(Actions);
  actions.create = create.bind(to);
  actions.createAt = createAt.bind(to);
  actions.destroy = destroy.bind(to);
  actions.parse = parse.bind(to);
  return actions;
}

// Forces
Actions.FORCE_ATTRACT = 'fa'
Actions.FORCE_REPELL  = 'fr'

// Scores
Actions.SCORE_HOST  = 'sh'
Actions.SCORE_GUEST = 'sg'
Actions.SCORE_ALIVE = 'sa'
Actions.SCORE_RESET = 'sr'

// Movement
Actions.PADDLE_MOVE = 'p'

// Misc
Actions.REVERSE     = 'r'
Actions.PUCK        = 'b'
Actions.PUCK_PUSH   = 'bp'
Actions.DEBUG_DIFF  = 'dd'


function create(type /*, ...*/){
  var send = this.host
    , opts = [].slice.call(arguments,1);

  switch(type){

    case Actions.PADDLE_MOVE:  // paddleIndex, x (number between 0 and 1)
      var i = +opts[0]
        , x = +opts[1];

      // inverted when host and index is 0
      if( i == 1 )
        this.paddles[i].x = 1-x;
      else
        this.paddles[i].x = x;

      // TODO instead of this "send-every-3rd-frame"-hack we should
      // be able to mark a packet type as unimportant so when the 
      // buffer is flushed we only send the last of the unimportant 
      // packets of the same type.
      send = this.physics.frame % 3 == 0; 

      // but don't send if it's the others movement
      if( (this.host && i == 1) || (!this.host && i == 0) )
        send = false;
      break;

    case Actions.PUCK_PUSH: // id, x, y
      var id = +opts[0]
        , x = +opts[1]
        , y = +opts[2];

      if( !this.pointMasses[id] )
        throw new Error('cannot push puck, does not exist yet');
      else
        this.pointMasses[id].applyForce(x,y);
      break;

    case Actions.PUCK: // x, y, mass
      var x = +opts[0]
        , y = +opts[1]
        , mass = +opts[2];

      var puck = new PointMass(x,y,mass);
      puck.id = this.pointMasses.length;
      puck.bounds = new Rect(0,1,1,0);
      puck.onbounds = function(at){

        if( at.y <= this.bounds.t ){
          
           var x = this.paddles[1].x
            , hw = this.paddles[1].width / 2;
          debug('hit %d guest',puck.id,at.x,x-hw,x+hw)
          if( at.x >= x - hw && at.x <= x + hw ){
            debug(' - paddle')
            this.host && this.actions.create(Actions.SCORE_ALIVE)

            // push the ball depending on where on the paddle it hit
            this.host && this.actions.create(Actions.PUCK_PUSH, puck.id, (at.x-x)/hw*40, 0)

            audio.play3D("hit2", new THREE.Vector3((puck.current.x-.5)*-0.8,0,puck.current.y*10));


          } else {

            debug(' - wall')
           
            audio.play3D("miss", new THREE.Vector3((puck.current.x-.5)*-0.8,0,puck.current.y*10));

            this.host && this.actions.create(Actions.SCORE_RESET)
            this.host && this.actions.create(Actions.SCORE_HOST)
          }
          //audio.playFx3D("hit", new THREE.Vector3((puck.current.x-.5)*-0.8,0,puck.current.y*10));

        } else if ( at.y >= this.bounds.b ){
          
          var x = this.paddles[0].x
            , hw = this.paddles[0].width / 2;
          debug('hit %d host',puck.id,at.x,x-hw,x+hw)

          if( at.x >= x - hw && at.x <= x + hw ){
            debug(' - paddle')
            this.host && this.actions.create(Actions.SCORE_ALIVE)

            // push the ball depending on where on the paddle it hit
            this.host && this.actions.create(Actions.PUCK_PUSH, puck.id, (at.x-x)/hw*40, 0)

            audio.play3D("hit2", new THREE.Vector3((puck.current.x-.5)*-0.8,0,puck.current.y*10));
            
          } else {

            debug(' - wall')
            audio.play3D("miss", new THREE.Vector3((puck.current.x-.5)*-0.8,0,puck.current.y*10));
            this.host && this.actions.create(Actions.SCORE_RESET)
            this.host && this.actions.create(Actions.SCORE_GUEST)

          } 
        }
        else {
          audio.play3D("hit", new THREE.Vector3((puck.current.x-.5)*-0.8,0,puck.current.y*10));
        }

        
        
      }.bind(this)
      puck.applyForce(-40,40)
      this.pointMasses.push(puck);

      break;

    case Actions.FORCE_REPELL:  // x, y, mass
      var kind = 'repell';

    case Actions.FORCE_ATTRACT: // x, y, mass
      var x = +opts[0]
        , y = +opts[1]
        , pt = new Point(x,y)
        , mass = +opts[2]
        , kind = kind || 'attract';

      var force = new Force(kind,pt);
      force.mass = mass || 1+Math.random()*5;
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

    case Actions.REVERSE:  // checked
      this.physics.reverse();
      this.reversed = this.form.reverse.checked;
      opts.push(this.form.reverse.checked?'1':'0')
      break;

    case Actions.DEBUG_DIFF: // remoteState
      var remoteState = opts[0] && opts[0].replace(/\\n/g,'\n')
        , localState = inspect(this.physics,{depth:Infinity});

      // received a state from other player
      if( remoteState ){
        console.log('got a remote state',diff.createPatch('diff',remoteState,localState))
        send = false;

      // sending state to other player
      } else {
        opts[0] = localState.replace(/\n/mg,'\\n');
        send = true; 
      }

      console.log('debug diff! sending @%d? %s',this.physics.frame,send)

      break;

    default:
      console.warn('undefined action:',type,arguments)
      send = false;

  }

  // if host, send a serialized action on this.channel
  // TODO buffer and send at specified interval (1/30?)
  if( send ){
    this.channel.send([
      type,
      this.physics.frame,
      opts.join('‚') // note: not a regular comma (alt-comma)
    ].join('·')); // note: alt-shift-period
  }
}

function parse(msg){
  var RE_ACTION = /(\w{1,2})·(?:(\d+)·)?(.+)$/g  // note: alt-shift-period
    , md
  while( md = RE_ACTION.exec(msg) ){
    var type = md[1]
      , frame = +md[2]
      , opts = md[3].split('‚'); // note: not a regular comma (alt-comma)

    if( frame ){
      debug('parse creating %s@%d',type,frame)
      createAt.apply(this,[frame,type].concat(opts))
    } else {
      debug('parse creating %s',type)
      create.apply(this,[type].concat(opts))
    }
  }
}

function createAt(frame, type /*, ...*/){
  var currentFrame = this.physics.frame;
  debug('createAt[%d:%d] %s',frame,currentFrame, type);
  this.physics.goto(frame)
  create.apply(this,[].slice.call(arguments,1))
  this.physics.goto(currentFrame)
}

function destroy(action){
  // TODO
}
