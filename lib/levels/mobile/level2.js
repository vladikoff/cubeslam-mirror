module.exports = {

  minSpawnTime:2,
  maxSpawnTime:6,
  maxExtras:5,

  ai: {
    maxSpeed: 10,
    reaction: 0.2,
    viewRange: 0.6,
    confusion:0.8
  },

  puck: {
    speed: 1.3,
    speedup: .1,
    maxspeed: 2
  },

  player: {
    shields: 2
  },

  set: 'empty',

  extras: [
    {id: 'extralife', probability: 80, simultaneous:2},
    {id: 'multiball', probability: 20, simultaneous:1},
    {id: 'fog', round: 3, probability: 40},
    {id: 'bulletproof', round: 3, probability: 40},
    {id: 'ghostball', round: 4, probability: 60}
  ]
}
