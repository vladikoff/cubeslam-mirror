module.exports = {
  ai: {
    maxSpeed: 10,
    reaction: 0.34,
    viewRange: 0.5,
    confusion:0.5
  },

  puck: {
    speed: 1.6,
    speedup: .1,
    maxspeed: 2.5
  },

  player: {
    shields: 5
  },

  set: 'diagonalattract',

  extras: [
    {id: 'extralife',probability: 5},
    {id: 'fog', duration: 5},
    {id: 'fireball',probability: 10},
    {id: 'ghostball',probability: 5},
    {id: 'paddleresize', round:2, probability: 10},
    {id: 'laser', round:3, probability: 10}
  ]
}
