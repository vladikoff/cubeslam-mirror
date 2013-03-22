module.exports = {
  ai: {
    maxSpeed: 17,
    reaction: 0.3,
    viewRange: 0.3,
    confusion:0.5
  },

  puck: {
    speed: 1.5,
    speedup: .1,
    maxspeed: 2
  },

  player: {
    shields: 6
  },

  set: 'hexagon',

  extras: [
    {id: 'fireball'},
    {id: 'extralife'},
    {id: 'fog', duration: 10},
    {id: 'bulletproof'},
    
  ]
}