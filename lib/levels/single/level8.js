module.exports = {
  ai: {
    maxSpeed: 20,
    reaction:0.4,
    viewRange:0.5
  },

  puck: {
    speed: 1.8,
    speedup: .1,
    maxspeed: 4
  },

  player: {
    shields: 8
  },

  set: 'diamond',

  extras: [
    {id: 'extralife'},
    {id: 'fog', duration: 10},
    {id: 'multiball'},
    {id: 'fireball'},
    {id: 'ghostball'},
    {id: 'bulletproof', duration: 10}, // duration in seconds (buggy)
    {id: 'mirroredcontrols', duration: 10}
  ]
}
