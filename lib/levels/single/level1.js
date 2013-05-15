module.exports = {
  maxExtras:3,
  ai: {
    maxSpeed: 10,
    reaction: 0.2,
    viewRange: 0.4,
    confusion:1
  },

  puck: {
    speed: 1.3,
    speedup: 0.1,
    maxspeed: 2
  },

  player: {
    shields: 1
  },

  set: 'empty',

  extras: [
    {id: 'extralife', round:2, probability: 10},
    {id: 'ghostball', round:4, probability: 6},
    {id: 'paddleresize'}
  ]
}
