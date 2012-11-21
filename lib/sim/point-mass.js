var Point = require('./point')
  , Link = require('./link')
  , Collisions = require('./collisions');

module.exports = PointMass;

function noop(){};

function PointMass(x,y,mass){
  this.previous = new Point(x,y);
  this.current = new Point(x,y);
  this.acceleration = new Point();
  this.velocity = new Point();

  this.mass = mass || 1;
  this.damping = 1; // 0-1
  this.links = []; // TODO linked list?!

  this.bounds = null;
  this.onbounds = noop;

  this.collidables = []; // TODO linked list?!
  this.oncollision = noop;

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

    this.velocity.fix(5)

    this._next.set(
      this.current.x + this.velocity.x + .5 * this.acceleration.x * tsq,
      this.current.y + this.velocity.y + .5 * this.acceleration.y * tsq
    ).fix(5)

    this.previous.set(this.current);
    this.current.set(this._next);

    this.acceleration.reset();
  },

  solveConstraints: function(){
    // Pinned
    if( this._pinned )
      return this.current.set(this._pinned);

    // Links
    for(var i=0; i < this.links.length; i++ )
      this.links[i].solve();

    // Collisions (polygons)
    for( var i=0; i < this.collidables.length; i++ )
      Collisions.pointMassToPoly(this, this.collidables[i]);

    // Boundaries (rects)
    if( this.bounds )
      Collisions.pointMassToRect(this, this.bounds);

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
  },

  toString: function(){
    return '{'
    +' c:'+this.current.toString()
    +' p:'+this.previous.toString()
    +' v:'+this.velocity.toString()
    +' a:'+this.acceleration.toString()
    +' }'
  }

}