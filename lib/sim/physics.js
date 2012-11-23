var debug = require('debug')('physics')
  , History = require('./history');


module.exports = Physics;

function Physics(){
  this.constraintAccuracy = 3;
  this.timeStep = 1/60;
  this.history = new History();
}

Physics.prototype = {

  goto: function(frame, world){
    debug('goto',frame)

    // rewind by restore
    if( frame < world.frame )
      return this.history.restore(frame,world);

    // ffw by updates
    while( world.frame < frame )
      this.update(world, this.timeStep);
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

    // store in History
    this.history.save(world);
  }

}