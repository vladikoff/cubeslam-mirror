module.exports = {
  maxExtras:3,
  ai: {
    maxSpeed: 10,
    reaction: 0.2,
    viewRange: 0.4,
    confusion:.8
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
    {id: 'extralife', round:1, probability: 5},
    {id: 'multiball', round:1, probability: 7},
    {id: 'ghostball', round:1, probability: 7},
  ]
}