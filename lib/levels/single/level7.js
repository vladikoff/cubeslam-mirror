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

  extras: {
    available: [
      {id: 'extralife'},
      {id: 'fog', duration: 10},
      {id: 'multiball'},
      {id: 'fireball'},
      {id: 'ghostball'},
      {id: 'bulletproof', duration: 10}
    ],
    positions: [
      {x: 200, y: 200},
      {x: 850, y: 1700},
      {x: 850, y: 700},
      {x: 200, y: 2000},
      {x: 1400, y: 200},
      {x: 1400, y: 2000}
    ]
  }
}
