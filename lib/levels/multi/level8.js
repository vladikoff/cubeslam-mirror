module.exports = {
  ai: {
    maxSpeed: 19,
    reaction:0.3,
    viewRange:0.2,
    confusion:0.7
  },

  puck: {
    speed: 1.4,
    speedup: .1,
    maxspeed: 1.9
  },

  player: {
    shields: 8
  },

  set: 'diamond',

  extras: [
    {id: 'extralife'},
    {id: 'fog', duration: 10},
    {id: 'laser'},
    {id: 'ghostball'},
    {id: 'bulletproof', duration: 10}, // duration in seconds (buggy)
    {id: 'mirroredcontrols', duration: 10}
  ]
}
