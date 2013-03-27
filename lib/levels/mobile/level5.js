module.exports = {
  ai: {
    maxSpeed: 18,
    reaction: 0.4,
    viewRange: 0.6
  },

  puck: {
    speed: 1.6,
    speedup: .1,
    maxspeed: 2
  },

  player: {
    shields: 3
  },

  set: 'diagonalattract',

  extras: [
    {id: 'extralife'},
    {id: 'fog', duration: 10},
    {id: 'ghostball'}
  ]
}
