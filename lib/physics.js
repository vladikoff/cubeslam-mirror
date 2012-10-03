
module.exports = Physics;

function Physics(){
  this.pointMasses = [];
  this.constraintAccuracy = 3;
}

Physics.prototype = {
    
  update: function(timeStep){
    // solve constraints
    for(var i=0; i < this.constraintAccuracy; i++){
      for(var j=0; j < this.pointMasses.length; j++)
        this.pointMasses[j].solveConstraints();
      
      // TODO circles?
    }

    // update position
    for(var i=0; i < this.pointMasses.length; i++)
      this.pointMasses[i].update(timeStep);
  }

}