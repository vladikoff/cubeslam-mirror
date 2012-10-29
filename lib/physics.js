var debug = require('debug')('physics');


module.exports = Physics;

function Physics(){
  this.frame = 0;
  this.direction = 1;
  this.pointMasses = [];
  this.forces = [];
  this.constraintAccuracy = 3;
}

Physics.prototype = {

  goto: function(frame){
    debug('goto',frame)
    var direction = this.direction;

    // set the direction depending on the frame
    this.direction = this.frame > frame ? -1 : +1;

    // ok, going backwards
    if( this.direction !== direction )
      this.reversePointMasses();

    // run updates until we arrive at the desired frame
    while( this.frame != frame  )
      this.update(1/60); // TODO don't hard code the timeStep

    // done, now we go forwards again
    if( this.direction !== direction )
      this.reversePointMasses();
    
    // reset the direction to the original one
    this.direction = direction;
  },

  reverse: function(){
    debug('reverse')
    this.reversePointMasses();
    this.direction = -this.direction;
  },

  reversePointMasses: function(){
    // reverse positions of each point mass
    for(var i=0; i < this.pointMasses.length; i++){
      var pointMass = this.pointMasses[i]
        , tempx = pointMass.current.x
        , tempy = pointMass.current.y;
      pointMass.current.set(pointMass.previous);
      pointMass.previous.set(tempx,tempy);
    }
  },
    
  update: function(timeStep){
    // solve constraints
    for(var i=0; i < this.constraintAccuracy; i++)
      for(var j=0; j < this.pointMasses.length; j++)
        this.pointMasses[j].solveConstraints();

    // update position
    for(var i=0; i < this.pointMasses.length; i++){
      // Apply forces (if any)
      for( var a=0; a < this.forces.length; a++ )
        this.forces[a].applyForce(this.pointMasses[i]);
      
      this.pointMasses[i].update(timeStep);
    }

    this.frame += this.direction;
  }

}