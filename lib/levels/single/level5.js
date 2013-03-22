module.exports = {
  ai: {
    maxSpeed: 18,
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
    {id: 'extralife'},
    {id: 'fog', duration: 10},
    {id: 'fireball'},
    {id: 'ghostball'}
  ]
}
