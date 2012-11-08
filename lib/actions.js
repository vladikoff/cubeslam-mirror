





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
  actions.flush = buffer.flush.bind(buffer);
  return actions;
}

// Forces
Actions.FORCE_ATTRACT = 'fa'
Actions.FORCE_REPELL  = 'fr'

// Scores
Actions.SCORE_A     = 'sb'
Actions.SCORE_B     = 'sa'
Actions.SCORE_ALIVE = 'sl'
Actions.SCORE_RESET = 'sr'

// Movement
Actions.PADDLE_MOVE = 'p'

// Misc
Actions.REVERSE     = 'r'
Actions.PUCK_CREATE = 'bc'
Actions.PUCK_PUSH   = 'bp'
Actions.DEBUG_DIFF  = 'dd'


function create(type /*, ...*/){
  // 0: don't send
  // 1: send reliable (with frame)
  // 2: send unreliable (without frame)
  var send = this.host ? 1 : 0 
    , opts = [].slice.call(arguments,1)
    , world = this.world;

  switch(type){

    case Actions.PADDLE_MOVE:  // paddleIndex, x (number between 0 and 1)
      var i = +opts[0]
        , x = +opts[1];

      // inverted when host and index is 0
      if( i == 1 )
        world.paddles[i].x = 1-x;
      else
        world.paddles[i].x = x;

      // don't send if it's the others movement
      if( (this.host && i == 1) || (!this.host && i == 0) )
        send = 0;

      // otherwise send it as unreliable
      else
        send = 2;
      break;

    case Actions.PUCK_PUSH: // id, x, y
      var id = +opts[0]
        , x = +opts[1]
        , y = +opts[2];

      debug('puck push [%s] %s,%s',id, x, y)

      if( !world.pucks[id] )
        throw new Error('cannot push puck, does not exist yet');
      else
        world.pucks[id].applyForce(x,y);
      break;

    case Actions.PUCK_CREATE: // x, y, mass
      var x = +opts[0]
        , y = +opts[1]
        , mass = +opts[2];


      debug('puck create [%s] %s,%s %s',world.pucks.length, x, y, mass)

      var puck = new PointMass(x,y,mass);
      puck.id = world.pucks.length;
      puck.bounds = new Rect(0,1,1,0);
      puck.onbounds = function(at){
        var player = null;

        if( at.y <= 0 )
          player = world.players.a;
        else if( at.y >= 1 )
          player = world.players.b;

        if( player ){

          var x = Math.min( 1, Math.max( 0, player.paddle.x ) )
            , hw = player.paddle.width / 2;

          debug('hit [%s] %s %s>%s<%s',puck.id,player.name,x-hw,at.x,x+hw)
          
          if( at.x >= x - hw && at.x <= x + hw ){
            debug(' - paddle')

            // push the ball depending on where on the paddle it hit
            var diff = at.x-x
              , force = diff/hw * 40;

            // only the host updates scores and modifies the world
            if( this.host ){
              this.actions.create(Actions.PUCK_PUSH, puck.id, force, 0)            
              this.actions.create(Actions.SCORE_ALIVE)
            }

            audio.play3D("hit2", new THREE.Vector3((puck.current.x-.5)*-0.8,0,puck.current.y*10));


          } else {
            debug(' - wall')

            // only the host updates scores and modifies the world
            if( this.host ){
              this.actions.create(Actions.SCORE_RESET)

              if( player == world.players.a )
                this.actions.create(Actions.SCORE_B)
              else if( player == world.players.b )
                this.actions.create(Actions.SCORE_A)
            }

            audio.play3D("miss", new THREE.Vector3((puck.current.x-.5)*-0.8,0,puck.current.y*10));

          }

          //audio.playFx3D("hit", new THREE.Vector3((puck.current.x-.5)*-0.8,0,puck.current.y*10));
        }
        
      }.bind(this)
      world.pucks.push(puck);

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
      world.forces.push(force);
      break;

    case Actions.SCORE_ALIVE:
      world.alive++;
      break;

    case Actions.SCORE_A:
      world.players.a.score++;
      break;

    case Actions.SCORE_B:
      world.players.b.score++;
      break;

    case Actions.SCORE_RESET:
      world.players.a.score += world.alive;
      world.players.b.score += world.alive;
      world.alive = 0;
      break;

    case Actions.REVERSE:  // checked
      this.physics.reverse();
      this.reversed = this.form.reverse.checked;
      opts.push(this.form.reverse.checked?'1':'0')
      break;

    case Actions.DEBUG_DIFF: // remoteState
      var remoteState = opts[0] && opts[0].replace(/\\n/g,'\n')
        , localState = inspect(world,{depth:Infinity});

      // received a state from other player
      if( remoteState ){
        console.log('got a remote state',diff.createPatch('diff',remoteState,localState))
        send = 0;

      // sending state to other player
      } else {
        opts[0] = localState.replace(/\n/mg,'\\n');
        send = 1;
      }

      console.log('debug diff! sending @%d? %s',world.frame,send)

      break;

    default:
      console.warn('undefined action:',type,arguments)
      send = 0;

  }

  // reliable
  if( send == 1 ){
    // note: not a regular comma (alt-comma)
    buffer.push([type, world.frame, opts.join('‚')])

  // unreliable
  } else if( send == 2 ){
    // note: not a regular comma (alt-comma)
    buffer.push([type, opts.join('‚')])
  }
}

// TODO optimize by grouping by frame number 
// (not necessary just now though as it's sent once every controls() anyway)

var buffer = [];
buffer.flush = function(channel){
  var unrel = {}
    , skipped = 0;

  // strip any extra unreliable messages
  for( var i=buffer.length-1; i >= 0; i-- ){
    var msg = buffer[i];

    // unreliable
    if( msg.length == 3 ){
      // already found one of this type
      // remove it
      if( unrel[msg[0]] ){ 
        buffer[i] = buffer.pop();
        skipped++;
      } else {
        unrel[msg[0]] = msg;
      }
    }

    // update buffer with string message
    buffer[i] = msg.join('·'); // note: alt-shift-period
  }

  // any left?
  if( buffer.length ){
    // send all messages, separated by newline
    channel.send(buffer.join('\n'));

    // console.log('sent %d messages, skipped %d unreliable messages',buffer.length,skipped);

    // reset buffer
    buffer.length = 0;
  }
}

function parse(msg){
  var RE_ACTION = /(\w{1,2})·(?:(\d+)·)?(.+)$/gm  // note: alt-shift-period
    , md
    , parsed = 0
  while( md = RE_ACTION.exec(msg) ){
    var type = md[1]
      , frame = +md[2]
      , opts = md[3].split('‚'); // note: not a regular comma (alt-comma)

    if( frame ){
      //debug('parse creating %s@%d',type,frame)
      createAt.apply(this,[frame,type].concat(opts))
    } else {
      //debug('parse creating %s',type)
      create.apply(this,[type].concat(opts))
    }
    parsed++;
  }
  // console.log('parsed %d messages',parsed)
}

function createAt(frame, type /*, ...*/){
  var currentFrame = this.world.frame;
  debug('createAt[%d:%d] %s',frame,currentFrame, type);
  this.physics.goto(this.world,frame)
  create.apply(this,[].slice.call(arguments,1))
  this.physics.goto(this.world,currentFrame)
}

function destroy(action){
  // TODO
}
