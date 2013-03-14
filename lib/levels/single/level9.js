module.exports = {
  ai: {
    maxSpeed: 20,
    reaction: 0.3,
    viewRange: 0.5
  },

  puck: {
    speed: 1.4,
    speedup: .1,
    maxspeed: 3
  },

  player: {
    shields: 9
  },

  set: 'breakout',

  extras: {
    available: [
      {id: 'extralife'},
      {id: 'fog', duration: 10},
      {id: 'multiball'},
      {id: 'fireball'},
      {id: 'ghostball'},
      {id: 'bulletproof', duration: 10}, // duration in seconds (buggy)
      {id: 'mirroredcontrols', duration: 10} // duration in seconds
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
