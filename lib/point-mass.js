var Point = require('./point')
  , Link = require('./link');

module.exports = PointMass;

function PointMass(x,y,mass){
  this.previous = new Point(x,y);
  this.current = new Point(x,y);
  this.acceleration = new Point();
  this.velocity = new Point();
  this.mass = mass || 1; 
  this.damping = 1; // 0-1
  this.links = []; // TODO linked list?!
  this.bounds = null; // TODO Rect(t,r,b,l)

  this._pinned = null;
  this._next = new Point();
}

PointMass.prototype = {
    
  update: function(timeStep){
    var tsq = timeStep * timeStep;

    // update velocity
    this.velocity.set(
      this.current.x-this.previous.x,
      this.current.y-this.previous.y
    )

    // apply damping
    if( this.damping != 1 )
      this.velocity.mul(this.damping);

    this._next.set(
      this.current.x + this.velocity.x + .5 * this.acceleration.x * tsq,
      this.current.y + this.velocity.y + .5 * this.acceleration.y * tsq
    )

    this.previous.set(this.current);
    this.current.set(this._next);

    this.acceleration.reset();
  },

  solveConstraints: function(){
    // Links
    for(var i=0; i < this.links.length; i++ )
      this.links[i].solve();

    // Boundaries
    if( this.bounds && !this.bounds.within(this.current) ){
      // Find intersection
      var intersections = this.bounds.intersectsWithLine(this.previous,this.current);

      // Make sure it's one, and only one
      if( !intersections )
        return;
      if( intersections.length > 1 )
        console.warn('something went wrong',intersections);

      var intersection = intersections[0];

      // Reflect against surface normal (n)
      // v' = v - 2(v⋅n)n
      var v1 = this.velocity.clone()
        , n = intersection.normal
        , vd = v1.dot(n) * 2
        , v2 = v1.clone().sub(n.mul(vd)).normalize()

      var p2 = v2.clone().mul(-Point.distance(intersection,this.previous))
        , c2 = v2.clone().mul(+Point.distance(intersection,this.current)) 

      this.previous.set(p2).add(intersection)
      this.current.set(c2).add(intersection)

      this.acceleration.reset()
    }

    // Pinned
    if( this._pinned )
      this.current.set(this._pinned);
  },

  attachTo: function(pointMass, restingDist, stiffness, tearSensitivity){
    if( this === pointMass )
      throw new Error('cannot attach to itself');
    if( !(pointMass instanceof PointMass) )
      throw new Error('must attach to PointMass');
    var link = new Link(this, pointMass, restingDist, stiffness, tearSensitivity);
    this.links.push(link);
    return link;
  },

  removeLink: function(link){
    var i = this.links.indexOf(link);
    this.links.splice(i,1);
    return link;
  },

  applyForce: function(x,y){
    var invMass = 1/this.mass;
    this.acceleration.add(x*invMass,y*invMass);
  },

  pinTo: function(x,y){
    if( !this._pinned )
      this._pinned = new Point(x,y)
    else
      this._pinned.set(x,y)
  }

}