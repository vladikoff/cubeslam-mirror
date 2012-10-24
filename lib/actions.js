var Force = require('./sim/force')
  , Point = require('./sim/point');

module.exports = Actions;

function Actions(to){
  var actions = Object.create(Actions);
  actions.create = create.bind(to);
  actions.createAt = createAt.bind(to);
  actions.destroy = destroy.bind(to);
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
Actions.REVERSE = 'r'


function create(type /*, ...*/){
  var send = this.host
    , opts = [].slice.call(arguments,1);

  switch(type){

    case Actions.PADDLE_MOVE:  // paddleIndex, inverted boolean, x number between 0 and 1
      var paddleIndex = +opts[0]
        , inverted = !!opts[1]
        , x = +opts[2];

      // inverted when 3d or host
      if( inverted )
        this.paddles[paddleIndex].x = 1-x;
      else
        this.paddles[paddleIndex].x = x;

      // TODO instead of this "send-every-3rd-frame"-hack we should
      // be able to mark a packet type as unimportant so when the 
      // buffer is flushed we only send the last of the unimportant 
      // packets of the same type.
      send = this.physics.frame % 3 == 0; 
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

    default:
      console.warn('undefined action:',type,arguments)
      send = false;

  }

  // if host, send a serialized action on this.channel
  // TODO buffer and send at specified interval (1/30?)
  if( send )
    this.channel.send([type,this.physics.frame,opts.join(',')].join('#'));
}

function parse(msg){
  var RE_ACTION = /(\w{1,2})#(\d+#)?(.+)$/g
  while( RE_ACTION.exec(msg) ){
    var type = RegExp.$1
      , frame = +RegExp.$2
      , opts = RegExp.$3.split(',');

    if( frame )
      createAt.apply(this,[frame,type].concat(opts))
    else
      create.apply(this,[type].concat(opts))
  }
}

function createAt(frame, type /*, ...*/){
  var currentFrame = this.physics.frame;
  this.physics.goto(frame)
  create.apply(this,[].slice.call(arguments,1))
  this.physics.goto(currentFrame)
}

function destroy(action){

}
