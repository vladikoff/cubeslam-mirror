module.exports = {
  maxExtras: 2,
  minSpawnTime: 3,
  maxSpawnTime: 6,

  ai: {
    maxSpeed: 10,
    reaction: 0.3,
    viewRange: 0.5,
    confusion: 0.5
  },

  puck: {
    speed: 1.5,
    speedup: .1,
    maxspeed: 2.5
  },

  player: {
    shields: 2
  },

  set: 'diagonalrocks',

  extras: [
    {id: 'extralife', probability: 5},
    {id: 'laser', probability: 7},
    {id: 'ghostball', probability: 3},
    {id: 'bulletproof', duration: 5},
    {id: 'timebomb', probability: 8},
    {id: 'paddleresize', probability: 7 },
    {id: 'mirroredcontrols', round: 5, duration: 15} // duration in seconds
  ]
}