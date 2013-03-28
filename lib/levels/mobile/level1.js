module.exports = {
  ai: {
    maxSpeed: 10,
    reaction: 0.9,
    viewRange: 0.4,
    confusion:1
  },

  puck: {
    speed: 1.5,
    speedup: .1,
    maxspeed: 2
  },

  player: {
    shields: 1
  },

  set: 'empty',

  extras: [
    {id: 'extralife', round:2, probability: 5},
    {id: 'multiball', round:3, probability: 10},
    {id: 'ghostball', probability: 20},
    {id: 'bulletproof', probability: 20}
  ]
}
