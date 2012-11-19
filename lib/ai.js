var Point = require('./sim/point');


module.exports = AI;

function AI(){
  
  // TODO setting for "skill"?

  this.position = new Point();

}

AI.prototype = {
  
  update: function(world){

    // find closest puck
    var closest = null;
    var minDist = Number.MAX_VALUE;
    for (var i = 0; i < world.pucks.length; i++) {
      var puck = world.pucks[i].current
        , dx = this.position.x - puck.x
        , dy = this.position.y - puck.y
        , dist = dx*dx+dy*dy;
      if( dist < minDist ){
        minDist = dist;
        closest = world.pucks[i];
      }
    }

    // no puck found
    if( !closest )
      return false;

    // follow puck at an accelerating speed (w. max)
    this.position.x += (closest.current.x - this.position.x)/2;

    // ai has moved, let them know
    return true;
  }

}