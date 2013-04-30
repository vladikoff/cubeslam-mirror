module.exports = {
  ai: {
    maxSpeed: 19,
    reaction:0.3,
    viewRange:0.3,
    confusion:0.45
  },

  puck: {
    speed: 1.8,
    speedup: .1,
    maxspeed: 2.5
  },

  player: {
    shields: 8
  },

  set: 'diamond',

  extras: [
    {id: 'extralife'},
    {id: 'fog', duration: 10},
    {id: 'fireball'},
    {id: 'ghostball'},
    {id: 'bulletproof', duration: 10}, // duration in seconds (buggy)
    {id: 'mirroredcontrols', duration: 10}
  ]
}
