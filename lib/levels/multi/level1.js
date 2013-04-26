module.exports = {
  maxExtras: 1,
  ai: {
    maxSpeed: 10,
    reaction: 0.2,
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

  set: 'trianglesmini',
  // set: 'barrier',

  extras: [
    {id: 'extralife', round:1, probability: 15},
    {id: 'timebomb', round:1},
    {id: 'ghostball', probability: 7},
    {id: 'fog', round: 3, probability: 7}
  ]
}
