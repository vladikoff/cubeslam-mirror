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

  set: 'random',

  extras: [
    {id: 'extralife'},
    {id: 'bulletproof', duration: 10},
    {id: 'laser', duration: 5}
  ]
}
