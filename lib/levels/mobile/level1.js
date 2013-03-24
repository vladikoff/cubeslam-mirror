module.exports = {
  ai: {
    maxSpeed: 20,
    reaction: 0.2,
    viewRange: 0.4,
    confusion: 0.5
  },

  puck: {
    speed: 1.3,
    speedup: .1,
    maxspeed: 2
  },

  player: {
    shields: 3
  },

  set: 'empty',

  extras: [
    {id: 'extralife', round:2, probability: 5},
    {id: 'multiball', round:3, probability: 10},
    {id: 'ghostball', round:1, probability: 20},
  ]
}
