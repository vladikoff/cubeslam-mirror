
module.exports = {
  minSpawnTime: 3,
  maxSpawnTime: 6,
  maxExtras:4,

  ai: {
    maxSpeed: 10,
    reaction: 0.2,
    viewRange: 0.6,
    confusion: 0.8
  },

  puck: {
    speed: 1.6,
    speedup: .1,
    maxspeed: 2.2
  },

  player: {
    shields: 4
  },

  // set: 'pipe',
  set: 'tridiamonds',

  extras: [
    // {id: 'extralife', probability: 10},
    {id: 'ghostball', probability: 7},
    {id: 'paddleresize', round:2, probability: 10 },
    {id: 'fog', probability: 7},
    {id: 'mirroredcontrols', round: 4, duration: 15}, // duration in seconds
    {id: 'bulletproof', duration: 10, probability: 5},
    {id: 'timebomb', round: 2, probability: 6}
  ]
}
