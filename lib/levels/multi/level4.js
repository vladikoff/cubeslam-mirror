
module.exports = {
  minSpawnTime: 3,
  maxSpawnTime: 6,
  maxExtras:3,

  ai: {
    maxSpeed: 10,
    reaction: 0.2,
    viewRange: 0.6,
    confusion: 0.8
  },

  puck: {
    speed: 1.5,
    speedup: .1,
    maxspeed: 2
  },

  player: {
    shields: 2
  },

  // set: 'pipe',
  set: 'tridiamonds',

  extras: [
    {id: 'extralife', probability: 10},
    {id: 'ghostball', probability: 6},
    {id: 'paddleresize', round:2, probability: 10 },
    {id: 'fog', round: 2, probability: 5},
    {id: 'mirroredcontrols', round: 4, duration: 15}, // duration in seconds
    {id: 'bulletproof', duration: 10, probability: 5},
    {id: 'timebomb', round: 2, probability: 6}
  ]
}
