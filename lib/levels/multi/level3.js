module.exports = {
  minSpawnTime: 3,
  maxSpawnTime: 6,
  maxExtras: 3,

  ai: {
    maxSpeed: 10,
    reaction: 0.2,
    viewRange: 0.5,
    confusion: 0.7
  },

  puck: {
    speed: 1.5,
    speedup: 0.1,
    maxspeed: 2
  },

  player: {
    shields: 3
  },

  set: 'trianglesbarrier',

  extras: [
    {id: 'extralife', probability: 6},
    {id: 'timebomb', probability: 6},
    {id: 'ghostball', probability: 3},
    {id: 'fog', probability: 3},
    {id: 'paddleresize', probability: 10 },
    {id: 'mirroredcontrols', round: 5, duration: 15}, // duration in seconds
    {id: 'bulletproof', duration: 10, probability: 5}
  ]
}
