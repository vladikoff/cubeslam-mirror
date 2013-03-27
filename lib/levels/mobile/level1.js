module.exports = {
  ai: {
    maxSpeed: 10,
    reaction: 0.2,
    viewRange: 0.4,
    confusion:1
  },

  puck: {
    speed: 1.3,
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
    {id: 'ghostball', round:1, probability: 20},
  ]
}
