module.exports = {
  ai: {
    maxSpeed: 19,
    reaction:0.3,
    viewRange:0.4
  },

  puck: {
    speed: 1.7,
    speedup: .1,
    maxspeed: 2
  },

  player: {
    shields: 7
  },

  set: 'diagonalblocks',

  extras: [
    {id: 'extralife'},
    {id: 'fog', duration: 10},
    {id: 'fireball'},
    {id: 'ghostball'},
    {id: 'bulletproof', duration: 10}
  ]
}
