module.exports = {

  minSpawnTime:2,
  maxSpawnTime:6,
  maxExtras:3,

  ai: {
    maxSpeed: 10,
    reaction: 0.2,
    viewRange: 0.6,
    confusion:0.8
  },

  puck: {
    speed: 1.5,
    speedup: .1,
    maxspeed: 2
  },

  player: {
    shields: 2
  },

  set: 'empty',

  extras: [
    {id: 'extralife', probability: 60},
    {id: 'multiball', probability: 20},
    {id: 'laser',probability: 50},
    {id: 'fog', round: 3, probability: 40},
    {id: 'bulletproof', round: 3, probability: 40},
    {id: 'timebomb', round: 2, probability: 60}
  ]
}
