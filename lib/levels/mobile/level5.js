module.exports = {
  ai: {
    maxSpeed: 17,
    reaction: 0.3,
    viewRange: 0.5,
    confusion:0.4
  },

  puck: {
    speed: 1.3,
    speedup: .1,
    maxspeed: 2
  },

  player: {
    shields: 6
  },

  set: 'diagonalattract',

  extras: [
    {id: 'extralife', probability: 4},
    {id: 'fog', duration: 10},
    {id: 'ghostball', probability: 4},
    {id: 'bulletproof', round: 3, probability: 40}
  ]
}
