var debug = require('debug')('physics');


module.exports = Physics;

function Physics(){
  this.constraintAccuracy = 3;
  this.timeStep = 1/60;
}

Physics.prototype = {

  goto: function(world, frame){
    debug('goto',frame)
    var direction = world.direction;

    // set the direction depending on the frame
    world.direction = world.frame > frame ? -1 : +1;

    // ok, going backwards
    if( world.direction !== direction )
      this.reversePointMasses(world);

    // run updates until we arrive at the desired frame
    while( world.frame != frame  )
      this.update(world, this.timeStep);

    // done, now we go forwards again
    if( world.direction !== direction )
      this.reversePointMasses(world);
    
    // reset the direction to the original one
    world.direction = direction;
  },

  reverse: function(world){
    debug('reverse')
    this.reversePointMasses(world);
    world.direction = -world.direction;
  },

  reversePointMasses: function(world){
    // reverse positions of each point mass
    for(var i=0; i < world.pucks.length; i++){
      var pointMass = world.pucks[i]
        , tempx = pointMass.current.x
        , tempy = pointMass.current.y;
      pointMass.current.set(pointMass.previous);
      pointMass.previous.set(tempx,tempy);
    }
  },
    
  update: function(world, timeStep){
    this.timeStep = timeStep;
    
    // solve constraints
    for(var i=0; i < this.constraintAccuracy; i++)
      for(var j=0; j < world.pucks.length; j++)
        world.pucks[j].solveConstraints();

    // update position
    for(var i=0; i < world.pucks.length; i++){
      // Apply forces (if any)
      for( var a=0; a < world.forces.length; a++ )
        world.forces[a].applyForce(world.pucks[i]);
      
      world.pucks[i].update(timeStep);
    }

    world.frame += world.direction;
  }

}