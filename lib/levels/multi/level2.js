module.exports = {

  minSpawnTime:2,
  maxSpawnTime:6,
  maxExtras:2,

  ai: {
    maxSpeed: 10,
    reaction: 0.2,
    viewRange: 0.6,
    confusion: 0.8
  },

  puck: {
    speed: 1.3,
    speedup: .1,
    maxspeed: 2
  },

  player: {
    shields: 2
  },

  // set: 'pipe',
  set: 'tridiamonds',

  extras: [
    {id: 'extralife', probability: 80},
    {id: 'fog', round: 3, probability: 40},
    {id: 'ghostball', probability: 60},
    {id: 'laser',probability: 40},
    {id: 'mirroredcontrols', round: 4, duration: 10} // duration in seconds
  ]
}
