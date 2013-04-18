module.exports = {
  minSpawnTime: 3,
  maxSpawnTime: 6,
  maxExtras: 6,

  ai: {
    maxSpeed: 10,
    reaction: 0.2,
    viewRange: 0.5,
    confusion: 0.7
  },

  puck: {
    speed: 1.3,
    speedup: 0.1,
    maxspeed: 2
  },

  player: {
    shields: 3
  },

  set: 'columns',

  extras: [
    {id: 'extralife', probability: 6},
    {id: 'timebomb', probability: 6},
    {id: 'ghostball', probability: 6},
    {id: 'fog', probability: 1},
  ]
}
