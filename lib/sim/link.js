var Point = require('./point');

module.exports = Link;

function Link(pointMassA, pointMassB, restingDistance, stiffness, tearSensitivity ){
  if( !pointMassA )
    throw new Error('invalid point mass a')
  if( !pointMassB )
    throw new Error('invalid point mass b')
  if( typeof restingDistance != 'number' )
    throw new Error('resting difference must be a number');
  if( typeof stiffness != 'number' )
    throw new Error('stiffness must be a number');
  if( typeof tearSensitivity != 'number' )
    throw new Error('tear sensitivity must be a number');

  this.a = pointMassA;
  this.b = pointMassB;
  this.restingDistance = restingDistance;
  this.stiffness = stiffness;
  this.tearSensitivity = tearSensitivity;
}

Link.prototype = {

  solve: function(){
    // calculate the distance between the two PointMasses
    var diff = Point.diff(this.b.current,this.a.current)
      , dist = diff.length
      , ratio = (this.restingDistance - dist) / dist;

    // if the distance is more than curtainTearSensitivity, the cloth tears
    if( dist > this.tearSensitivity )
      this.a.removeLink(this);

    // Inverse the mass quantities
    var imA = 1 / this.a.mass
      , imB = 1 / this.b.mass
      , scA = (imA / (imA + imB)) * this.stiffness
      , scB = this.stiffness - scA;

    // Push/pull based on mass
    // heavier objects will be pushed/pulled less than attached light objects
    this.a.current.add(diff.x*scA*ratio,diff.y*scA*ratio);
    this.b.current.sub(diff.x*scB*ratio,diff.y*scB*ratio);
  }

}