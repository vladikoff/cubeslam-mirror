module.exports = {
  maxExtras: 2,
  minSpawnTime: 4,
  maxSpawnTime: 7,

  ai: {
    maxSpeed: 10,
    reaction: 0.2,
    viewRange: 0.4,
    confusion:1
  },

  puck: {
    speed: 1.5,
    speedup: 0.1,
    maxspeed: 2
  },

  player: {
    shields: 1
  },

  set: 'arrows',

  extras: [
    {id: 'extralife', probability: 10},
    {id: 'timebomb', probability: 7},
    {id: 'ghostball', probability: 7},
    {id: 'paddleresize', round:2, probability: 10 },
    {id: 'bulletproof', duration: 6},
    {id: 'laser', round:2,probability: 10 },
    {id: 'fog', round: 3, probability: 7},
    {id: 'timebomb', round:3}
  ]
}
