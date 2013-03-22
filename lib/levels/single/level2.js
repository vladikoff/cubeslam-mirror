module.exports = {

  minSpawnTime:5,
  maxSpawnTime:6,

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
    {id: 'extralife', probability: 80},
    {id: 'multiball', probability: 20},
    {id: 'fireball', round:2, probability: 40},
    {id: 'fog', round: 3, probability: 40},
    {id: 'ghostball', round: 4, probability: 60}
  ]
}
