module.exports = {
  ai: {
    maxSpeed: 19,
    reaction:0.4,
    viewRange:0.6
  },

  puck: {
    speed: 1.7,
    speedup: .1,
    maxspeed: 4
  },

  player: {
    shields: 6
  },

  set: 'diagonalblocks',

  extras: [
    {id: 'extralife'},
    {id: 'fog', duration: 10},
    {id: 'multiball'},
    {id: 'fireball'},
    {id: 'ghostball'},
    {id: 'bulletproof', duration: 10}
  ]
}
