module.exports = {
  ai: {
    maxSpeed: 18,
    reaction: 0.4,
    viewRange: 0.6
  },

  puck: {
    speed: 1.6,
    speedup: .1,
    maxspeed: 3
  },

  player: {
    shields: 6
  },

  set: 'diagonalattract',

  extras: {
    available: [
      {id: 'extralife'},
      {id: 'fog', duration: 10},
      {id: 'fireball'},
      {id: 'ghostball'}
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
