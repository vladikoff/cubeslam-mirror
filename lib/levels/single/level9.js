module.exports = {
  ai: {
    maxSpeed: 20,
    reaction: 0.3,
    viewRange: 0.5,
    confusion:0.5
  },

  puck: {
    speed: 1.4,
    speedup: .1,
    maxspeed: 2
  },

  player: {
    shields: 9
  },

  set: 'breakout',

  extras: [
    {id: 'extralife'},
    {id: 'fog', duration: 10},
    {id: 'multiball'},
    {id: 'fireball'},
    {id: 'ghostball'},
    {id: 'bulletproof', duration: 10}, // duration in seconds (buggy)
    {id: 'mirroredcontrols', duration: 10} // duration in seconds
  ]
}
